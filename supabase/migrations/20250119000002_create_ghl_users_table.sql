-- Create centralized ghl_users table as the main reference for all GHL user data
CREATE TABLE IF NOT EXISTS public.ghl_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    
    -- GHL user information
    ghl_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    
    -- Role information
    primary_role TEXT CHECK (primary_role IN ('setter', 'sales_rep', 'admin', 'moderator', 'user')),
    
    -- App user linking
    app_user_id UUID REFERENCES auth.users(id),
    is_invited BOOLEAN DEFAULT FALSE,
    invited_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES auth.users(id),
    
    -- Activity tracking
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activity_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(account_id, ghl_user_id)
);

-- Create unique index for email constraint (allows multiple NULL emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_users_unique_email 
ON public.ghl_users(account_id, email) 
WHERE email IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ghl_users_account_id ON public.ghl_users(account_id);
CREATE INDEX IF NOT EXISTS idx_ghl_users_ghl_user_id ON public.ghl_users(ghl_user_id);
CREATE INDEX IF NOT EXISTS idx_ghl_users_app_user_id ON public.ghl_users(app_user_id) WHERE app_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ghl_users_role ON public.ghl_users(primary_role);
CREATE INDEX IF NOT EXISTS idx_ghl_users_invited ON public.ghl_users(is_invited);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ghl_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ghl_users_updated_at
    BEFORE UPDATE ON public.ghl_users
    FOR EACH ROW
    EXECUTE FUNCTION update_ghl_users_updated_at();

-- RLS Policies
ALTER TABLE public.ghl_users ENABLE ROW LEVEL SECURITY;

-- Allow users to see GHL users from their account
CREATE POLICY "Users can view ghl users in their account" ON public.ghl_users
    FOR SELECT USING (
        account_id IN (
            SELECT aa.account_id 
            FROM public.account_access aa 
            WHERE aa.user_id = auth.uid()
            AND aa.is_active = true
        )
    );

-- Allow account admins and moderators to manage GHL users
CREATE POLICY "Admins and moderators can manage ghl users" ON public.ghl_users
    FOR ALL USING (
        account_id IN (
            SELECT aa.account_id 
            FROM public.account_access aa 
            WHERE aa.user_id = auth.uid() 
            AND aa.role IN ('admin', 'moderator')
            AND aa.is_active = true
        )
    );

-- Update existing tables to reference ghl_users
-- Note: We keep the existing _ghl_id columns for backward compatibility and data integrity

-- Add foreign key references to ghl_users (optional, for data integrity)
-- We'll use these in queries but keep the existing ghl_id columns as backup

-- Create function to upsert GHL users and get their internal ID
CREATE OR REPLACE FUNCTION public.upsert_ghl_user(
    p_account_id UUID,
    p_ghl_user_id TEXT,
    p_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_primary_role TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_activity_count INTEGER;
BEGIN
    -- Calculate activity count across all tables
    SELECT 
        COALESCE(
            (SELECT COUNT(*) FROM public.appointments WHERE setter_ghl_id = p_ghl_user_id OR sales_rep_ghl_id = p_ghl_user_id AND account_id = p_account_id) +
            (SELECT COUNT(*) FROM public.discoveries WHERE setter_ghl_id = p_ghl_user_id OR sales_rep_ghl_id = p_ghl_user_id AND account_id = p_account_id) +
            (SELECT COUNT(*) FROM public.dials WHERE setter_ghl_id = p_ghl_user_id OR sales_rep_ghl_id = p_ghl_user_id AND account_id = p_account_id),
            0
        ) INTO v_activity_count;
    
    -- Insert or update GHL user
    INSERT INTO public.ghl_users (
        account_id, ghl_user_id, name, email, first_name, last_name, 
        phone, primary_role, last_seen_at, activity_count
    )
    VALUES (
        p_account_id, p_ghl_user_id, p_name, p_email, p_first_name, 
        p_last_name, p_phone, p_primary_role, NOW(), v_activity_count
    )
    ON CONFLICT (account_id, ghl_user_id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        primary_role = EXCLUDED.primary_role,
        last_seen_at = NOW(),
        activity_count = v_activity_count,
        updated_at = NOW()
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to sync GHL users from existing data
CREATE OR REPLACE FUNCTION public.sync_ghl_users_from_existing_data(p_account_id UUID) 
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Sync from appointments
    FOR v_record IN (
        SELECT DISTINCT 
            setter_ghl_id as ghl_id, 
            setter as name,
            'setter' as role
        FROM public.appointments 
        WHERE account_id = p_account_id 
        AND setter_ghl_id IS NOT NULL
        
        UNION
        
        SELECT DISTINCT 
            sales_rep_ghl_id as ghl_id, 
            sales_rep as name,
            'sales_rep' as role
        FROM public.appointments 
        WHERE account_id = p_account_id 
        AND sales_rep_ghl_id IS NOT NULL
    ) LOOP
        PERFORM public.upsert_ghl_user(
            p_account_id,
            v_record.ghl_id,
            v_record.name OR 'Unknown',
            NULL, NULL, NULL, NULL,
            v_record.role
        );
        v_count := v_count + 1;
    END LOOP;
    
    -- Sync from discoveries
    FOR v_record IN (
        SELECT DISTINCT 
            setter_ghl_id as ghl_id, 
            setter as name,
            'setter' as role
        FROM public.discoveries 
        WHERE account_id = p_account_id 
        AND setter_ghl_id IS NOT NULL
        
        UNION
        
        SELECT DISTINCT 
            sales_rep_ghl_id as ghl_id, 
            sales_rep as name,
            'sales_rep' as role
        FROM public.discoveries 
        WHERE account_id = p_account_id 
        AND sales_rep_ghl_id IS NOT NULL
    ) LOOP
        PERFORM public.upsert_ghl_user(
            p_account_id,
            v_record.ghl_id,
            v_record.name OR 'Unknown',
            NULL, NULL, NULL, NULL,
            v_record.role
        );
        v_count := v_count + 1;
    END LOOP;
    
    -- Sync from dials
    FOR v_record IN (
        SELECT DISTINCT 
            setter_ghl_id as ghl_id, 
            setter_name as name,
            'setter' as role
        FROM public.dials 
        WHERE account_id = p_account_id 
        AND setter_ghl_id IS NOT NULL
        
        UNION
        
        SELECT DISTINCT 
            sales_rep_ghl_id as ghl_id, 
            setter_name as name, -- Note: dials table might not have sales_rep name
            'sales_rep' as role
        FROM public.dials 
        WHERE account_id = p_account_id 
        AND sales_rep_ghl_id IS NOT NULL
    ) LOOP
        PERFORM public.upsert_ghl_user(
            p_account_id,
            v_record.ghl_id,
            v_record.name OR 'Unknown',
            NULL, NULL, NULL, NULL,
            v_record.role
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for dashboard candidates that uses the centralized ghl_users table
CREATE OR REPLACE VIEW public.dashboard_candidates AS
SELECT 
    gu.id,
    gu.ghl_user_id,
    gu.name,
    gu.email,
    gu.primary_role,
    gu.is_invited,
    gu.activity_count,
    gu.account_id,
    -- Check if they're a real app user
    CASE 
        WHEN gu.app_user_id IS NOT NULL THEN true
        ELSE false
    END as is_app_user,
    -- For compatibility with existing candidate interface
    CASE 
        WHEN gu.primary_role IN ('sales_rep', 'admin', 'moderator') THEN 'rep'
        ELSE 'setter'
    END as candidate_role
FROM public.ghl_users gu
WHERE gu.activity_count > 0; -- Only show users with activity 