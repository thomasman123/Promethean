-- Add multi-role support to ghl_users table
-- Allow users to have multiple roles (setter, sales_rep, etc.)

-- Add roles array column to track multiple roles
ALTER TABLE public.ghl_users 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add setter_activity_count and sales_rep_activity_count for role-specific tracking
ALTER TABLE public.ghl_users 
ADD COLUMN IF NOT EXISTS setter_activity_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_rep_activity_count INTEGER DEFAULT 0;

-- Create index for roles array
CREATE INDEX IF NOT EXISTS idx_ghl_users_roles ON public.ghl_users USING GIN(roles);

-- Create function to update role counts and determine roles
CREATE OR REPLACE FUNCTION public.update_ghl_user_roles(
    p_account_id UUID,
    p_ghl_user_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_setter_count INTEGER := 0;
    v_sales_rep_count INTEGER := 0;
    v_new_roles TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Count setter activities (where user appears as setter)
    SELECT COALESCE(SUM(activity_count), 0) INTO v_setter_count
    FROM (
        SELECT COUNT(*) as activity_count FROM public.appointments 
        WHERE setter_ghl_id = p_ghl_user_id AND account_id = p_account_id
        UNION ALL
        SELECT COUNT(*) as activity_count FROM public.discoveries 
        WHERE setter_ghl_id = p_ghl_user_id AND account_id = p_account_id
        UNION ALL
        SELECT COUNT(*) as activity_count FROM public.dials 
        WHERE setter_ghl_id = p_ghl_user_id AND account_id = p_account_id
    ) AS setter_activities;
    
    -- Count sales rep activities (where user appears as sales rep)
    SELECT COALESCE(SUM(activity_count), 0) INTO v_sales_rep_count
    FROM (
        SELECT COUNT(*) as activity_count FROM public.appointments 
        WHERE sales_rep_ghl_id = p_ghl_user_id AND account_id = p_account_id
        UNION ALL
        SELECT COUNT(*) as activity_count FROM public.discoveries 
        WHERE sales_rep_ghl_id = p_ghl_user_id AND account_id = p_account_id
        UNION ALL
        SELECT COUNT(*) as activity_count FROM public.dials 
        WHERE sales_rep_ghl_id = p_ghl_user_id AND account_id = p_account_id
    ) AS sales_rep_activities;
    
    -- Determine roles based on activity
    IF v_setter_count > 0 THEN
        v_new_roles := array_append(v_new_roles, 'setter');
    END IF;
    
    IF v_sales_rep_count > 0 THEN
        v_new_roles := array_append(v_new_roles, 'sales_rep');
    END IF;
    
    -- If no activity, keep as 'user'
    IF array_length(v_new_roles, 1) IS NULL THEN
        v_new_roles := ARRAY['user'];
    END IF;
    
    -- Update the user with new role counts and roles
    UPDATE public.ghl_users 
    SET 
        setter_activity_count = v_setter_count,
        sales_rep_activity_count = v_sales_rep_count,
        activity_count = v_setter_count + v_sales_rep_count,
        roles = v_new_roles,
        -- Update primary_role to the role with most activity, or first role if tied
        primary_role = CASE 
            WHEN v_sales_rep_count > v_setter_count THEN 'sales_rep'
            WHEN v_setter_count > v_sales_rep_count THEN 'setter'
            WHEN 'sales_rep' = ANY(v_new_roles) THEN 'sales_rep'
            WHEN 'setter' = ANY(v_new_roles) THEN 'setter'
            ELSE 'user'
        END,
        updated_at = NOW()
    WHERE account_id = p_account_id AND ghl_user_id = p_ghl_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the upsert_ghl_user function to use the new role tracking
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
BEGIN
    -- Insert or update GHL user (without activity counts, we'll calculate those next)
    INSERT INTO public.ghl_users (
        account_id, ghl_user_id, name, email, first_name, last_name, 
        phone, primary_role, last_seen_at
    )
    VALUES (
        p_account_id, p_ghl_user_id, p_name, p_email, p_first_name, 
        p_last_name, p_phone, p_primary_role, NOW()
    )
    ON CONFLICT (account_id, ghl_user_id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        last_seen_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_user_id;
    
    -- Update role counts and determine actual roles based on activity
    PERFORM public.update_ghl_user_roles(p_account_id, p_ghl_user_id);
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sync function to recalculate all roles
CREATE OR REPLACE FUNCTION public.sync_ghl_users_from_existing_data(p_account_id UUID) 
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Sync from appointments
    FOR v_record IN (
        SELECT DISTINCT 
            COALESCE(setter_ghl_id, sales_rep_ghl_id) as ghl_user_id,
            CASE 
                WHEN setter_ghl_id IS NOT NULL THEN setter 
                ELSE sales_rep 
            END as name,
            CASE 
                WHEN setter_ghl_id IS NOT NULL THEN 'setter'
                ELSE 'sales_rep'
            END as role
        FROM public.appointments 
        WHERE account_id = p_account_id 
        AND (setter_ghl_id IS NOT NULL OR sales_rep_ghl_id IS NOT NULL)
    ) LOOP
        PERFORM public.upsert_ghl_user(
            p_account_id := p_account_id,
            p_ghl_user_id := v_record.ghl_user_id,
            p_name := v_record.name,
            p_primary_role := v_record.role
        );
        v_count := v_count + 1;
    END LOOP;

    -- Sync from discoveries
    FOR v_record IN (
        SELECT DISTINCT 
            COALESCE(setter_ghl_id, sales_rep_ghl_id) as ghl_user_id,
            CASE 
                WHEN setter_ghl_id IS NOT NULL THEN setter 
                ELSE sales_rep 
            END as name,
            CASE 
                WHEN setter_ghl_id IS NOT NULL THEN 'setter'
                ELSE 'sales_rep'
            END as role
        FROM public.discoveries 
        WHERE account_id = p_account_id 
        AND (setter_ghl_id IS NOT NULL OR sales_rep_ghl_id IS NOT NULL)
    ) LOOP
        PERFORM public.upsert_ghl_user(
            p_account_id := p_account_id,
            p_ghl_user_id := v_record.ghl_user_id,
            p_name := v_record.name,
            p_primary_role := v_record.role
        );
        v_count := v_count + 1;
    END LOOP;

    -- Sync from dials
    FOR v_record IN (
        SELECT DISTINCT 
            COALESCE(setter_ghl_id, sales_rep_ghl_id) as ghl_user_id,
            CASE 
                WHEN setter_ghl_id IS NOT NULL THEN setter 
                ELSE sales_rep 
            END as name,
            CASE 
                WHEN setter_ghl_id IS NOT NULL THEN 'setter'
                ELSE 'sales_rep'
            END as role
        FROM public.dials 
        WHERE account_id = p_account_id 
        AND (setter_ghl_id IS NOT NULL OR sales_rep_ghl_id IS NOT NULL)
    ) LOOP
        PERFORM public.upsert_ghl_user(
            p_account_id := p_account_id,
            p_ghl_user_id := v_record.ghl_user_id,
            p_name := v_record.name,
            p_primary_role := v_record.role
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Populate existing data with multi-role information
-- Update all existing ghl_users to have proper role arrays
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN (
        SELECT account_id, ghl_user_id 
        FROM public.ghl_users 
        WHERE roles IS NULL OR array_length(roles, 1) IS NULL
    ) LOOP
        PERFORM public.update_ghl_user_roles(v_user.account_id, v_user.ghl_user_id);
    END LOOP;
END;
$$;

-- Add comment explaining the new columns
COMMENT ON COLUMN public.ghl_users.roles IS 'Array of roles this user fulfills (setter, sales_rep, admin, etc.)';
COMMENT ON COLUMN public.ghl_users.setter_activity_count IS 'Number of activities where this user acted as a setter';
COMMENT ON COLUMN public.ghl_users.sales_rep_activity_count IS 'Number of activities where this user acted as a sales rep'; 