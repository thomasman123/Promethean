-- Create pending_users table to store GHL users before they're invited to the app
CREATE TABLE IF NOT EXISTS public.pending_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    
    -- GHL user information
    ghl_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    
    -- Metadata
    role TEXT NOT NULL CHECK (role IN ('setter', 'sales_rep', 'admin', 'moderator', 'user')),
    permissions JSONB,
    
    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    invite_sent BOOLEAN DEFAULT FALSE,
    invite_accepted BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(account_id, ghl_user_id),
    UNIQUE(account_id, email) WHERE email IS NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_users_account_id ON public.pending_users(account_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_ghl_user_id ON public.pending_users(ghl_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON public.pending_users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_users_role ON public.pending_users(role);
CREATE INDEX IF NOT EXISTS idx_pending_users_invite_status ON public.pending_users(invite_sent, invite_accepted);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_pending_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_users_updated_at
    BEFORE UPDATE ON public.pending_users
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_users_updated_at();

-- RLS Policies
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Allow users to see pending users from their account
CREATE POLICY "Users can view pending users in their account" ON public.pending_users
    FOR SELECT USING (
        account_id IN (
            SELECT p.account_id 
            FROM public.profiles p 
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow account admins and moderators to manage pending users
CREATE POLICY "Admins and moderators can manage pending users" ON public.pending_users
    FOR ALL USING (
        account_id IN (
            SELECT p.account_id 
            FROM public.profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('admin', 'moderator')
        )
    );

-- Add setter_user_id and sales_rep_user_id to appointments table to reference pending users
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS setter_ghl_id TEXT,
ADD COLUMN IF NOT EXISTS sales_rep_ghl_id TEXT;

-- Add setter_user_id and sales_rep_user_id to discoveries table to reference pending users  
ALTER TABLE public.discoveries 
ADD COLUMN IF NOT EXISTS setter_ghl_id TEXT,
ADD COLUMN IF NOT EXISTS sales_rep_ghl_id TEXT;

-- Add setter_user_id and sales_rep_user_id to dials table to reference pending users
ALTER TABLE public.dials 
ADD COLUMN IF NOT EXISTS setter_ghl_id TEXT,
ADD COLUMN IF NOT EXISTS sales_rep_ghl_id TEXT;

-- Create function to upsert pending users
CREATE OR REPLACE FUNCTION public.upsert_pending_user(
    p_account_id UUID,
    p_ghl_user_id TEXT,
    p_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'user',
    p_permissions JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Insert or update pending user
    INSERT INTO public.pending_users (
        account_id, ghl_user_id, name, email, first_name, last_name, 
        phone, role, permissions, last_seen_at
    )
    VALUES (
        p_account_id, p_ghl_user_id, p_name, p_email, p_first_name, 
        p_last_name, p_phone, p_role, p_permissions, NOW()
    )
    ON CONFLICT (account_id, ghl_user_id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        last_seen_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to invite pending user to app
CREATE OR REPLACE FUNCTION public.invite_pending_user(
    p_pending_user_id UUID,
    p_invited_by UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
    v_pending_user public.pending_users%ROWTYPE;
    v_new_user_id UUID;
BEGIN
    -- Get pending user details
    SELECT * INTO v_pending_user
    FROM public.pending_users
    WHERE id = p_pending_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending user not found';
    END IF;
    
    -- Check if user already exists in profiles
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE account_id = v_pending_user.account_id 
        AND email = v_pending_user.email
    ) THEN
        RAISE EXCEPTION 'User already exists in the system';
    END IF;
    
    -- Create auth user (this would typically be done via auth API)
    -- For now, we'll just mark as invited and let the actual invitation be sent separately
    UPDATE public.pending_users 
    SET 
        invited_by = p_invited_by,
        invited_at = NOW(),
        invite_sent = TRUE,
        updated_at = NOW()
    WHERE id = p_pending_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view to get pending users with additional info
CREATE OR REPLACE VIEW public.pending_users_with_stats AS
SELECT 
    pu.*,
    -- Count how many appointments they're associated with
    COALESCE(app_count.count, 0) as appointment_count,
    COALESCE(disc_count.count, 0) as discovery_count,
    COALESCE(dial_count.count, 0) as dial_count,
    -- Get who invited them
    inviter.email as invited_by_email,
    inviter_profile.name as invited_by_name
FROM public.pending_users pu
LEFT JOIN (
    SELECT setter_ghl_id as ghl_id, account_id, COUNT(*) as count
    FROM public.appointments 
    WHERE setter_ghl_id IS NOT NULL
    GROUP BY setter_ghl_id, account_id
    UNION ALL
    SELECT sales_rep_ghl_id as ghl_id, account_id, COUNT(*) as count
    FROM public.appointments 
    WHERE sales_rep_ghl_id IS NOT NULL
    GROUP BY sales_rep_ghl_id, account_id
) app_count ON app_count.ghl_id = pu.ghl_user_id AND app_count.account_id = pu.account_id
LEFT JOIN (
    SELECT setter_ghl_id as ghl_id, account_id, COUNT(*) as count
    FROM public.discoveries 
    WHERE setter_ghl_id IS NOT NULL
    GROUP BY setter_ghl_id, account_id
    UNION ALL
    SELECT sales_rep_ghl_id as ghl_id, account_id, COUNT(*) as count
    FROM public.discoveries 
    WHERE sales_rep_ghl_id IS NOT NULL
    GROUP BY sales_rep_ghl_id, account_id
) disc_count ON disc_count.ghl_id = pu.ghl_user_id AND disc_count.account_id = pu.account_id
LEFT JOIN (
    SELECT setter_ghl_id as ghl_id, account_id, COUNT(*) as count
    FROM public.dials 
    WHERE setter_ghl_id IS NOT NULL
    GROUP BY setter_ghl_id, account_id
    UNION ALL
    SELECT sales_rep_ghl_id as ghl_id, account_id, COUNT(*) as count
    FROM public.dials 
    WHERE sales_rep_ghl_id IS NOT NULL
    GROUP BY sales_rep_ghl_id, account_id
) dial_count ON dial_count.ghl_id = pu.ghl_user_id AND dial_count.account_id = pu.account_id
LEFT JOIN auth.users inviter ON inviter.id = pu.invited_by
LEFT JOIN public.profiles inviter_profile ON inviter_profile.user_id = pu.invited_by; 