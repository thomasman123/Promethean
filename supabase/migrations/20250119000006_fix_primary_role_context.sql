-- Fix primary role determination to respect current activity context
-- When a user is upserted with a specific role, that should influence the primary role

-- Update the upsert function to pass the current role context to the role update function
CREATE OR REPLACE FUNCTION public.upsert_ghl_user(
    p_account_id UUID,
    p_ghl_user_id TEXT,
    p_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_primary_role TEXT DEFAULT 'setter'
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
    -- Pass the current role context to inform primary role decision
    PERFORM public.update_ghl_user_roles_with_context(p_account_id, p_ghl_user_id, p_primary_role);
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new role update function that considers current context
CREATE OR REPLACE FUNCTION public.update_ghl_user_roles_with_context(
    p_account_id UUID,
    p_ghl_user_id TEXT,
    p_current_role TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_setter_count INTEGER := 0;
    v_sales_rep_count INTEGER := 0;
    v_new_roles TEXT[] := ARRAY[]::TEXT[];
    v_new_primary_role TEXT;
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
    
    -- If no activity found, default to 'setter' since this is a GHL user
    IF array_length(v_new_roles, 1) IS NULL THEN
        v_new_roles := ARRAY['setter'];
    END IF;
    
    -- Determine primary role with context awareness
    -- Priority: current context > most activity > first role > default
    v_new_primary_role := CASE 
        -- If current context is provided and user has activity in that role, prefer it
        WHEN p_current_role = 'sales_rep' AND v_sales_rep_count > 0 THEN 'sales_rep'
        WHEN p_current_role = 'setter' AND v_setter_count > 0 THEN 'setter'
        -- If current context is provided but no activity yet, still honor it if it's a valid role
        WHEN p_current_role = 'sales_rep' AND 'sales_rep' = ANY(v_new_roles) THEN 'sales_rep'
        WHEN p_current_role = 'setter' AND 'setter' = ANY(v_new_roles) THEN 'setter'
        -- Fall back to activity-based determination
        WHEN v_sales_rep_count > v_setter_count THEN 'sales_rep'
        WHEN v_setter_count > v_sales_rep_count THEN 'setter'
        -- Equal activity - prefer sales_rep as it's typically higher level
        WHEN 'sales_rep' = ANY(v_new_roles) THEN 'sales_rep'
        WHEN 'setter' = ANY(v_new_roles) THEN 'setter'
        -- Default
        ELSE 'setter'
    END;
    
    -- Update the user with new role counts and roles
    UPDATE public.ghl_users 
    SET 
        setter_activity_count = v_setter_count,
        sales_rep_activity_count = v_sales_rep_count,
        activity_count = v_setter_count + v_sales_rep_count,
        roles = v_new_roles,
        primary_role = v_new_primary_role,
        updated_at = NOW()
    WHERE account_id = p_account_id AND ghl_user_id = p_ghl_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the old function for backward compatibility but have it use the new one
CREATE OR REPLACE FUNCTION public.update_ghl_user_roles(
    p_account_id UUID,
    p_ghl_user_id TEXT
) RETURNS VOID AS $$
BEGIN
    PERFORM public.update_ghl_user_roles_with_context(p_account_id, p_ghl_user_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the context-aware logic
COMMENT ON FUNCTION public.update_ghl_user_roles_with_context IS 'Updates GHL user roles and activity counts with awareness of current activity context. Prefers the current role when determining primary role if user has activity in that role.'; 