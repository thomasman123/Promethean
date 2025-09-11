-- Fix the backfill_user_data_on_invitation function to remove sales_rep_user_id references for dials table
-- since dials table doesn't have a sales_rep_user_id column

CREATE OR REPLACE FUNCTION public.backfill_user_data_on_invitation(
    p_ghl_user_id TEXT,
    p_account_id UUID,
    p_app_user_id UUID
)
RETURNS TABLE(appointments_updated INTEGER, discoveries_updated INTEGER, dials_updated INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_appointments_updated INTEGER := 0;
    v_discoveries_updated INTEGER := 0;
    v_dials_updated INTEGER := 0;
    v_temp_count INTEGER := 0;
BEGIN
    -- Update appointments where this GHL user was the setter
    UPDATE public.appointments 
    SET setter_user_id = p_app_user_id
    WHERE account_id = p_account_id 
    AND setter_ghl_id = p_ghl_user_id 
    AND setter_user_id IS NULL;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_appointments_updated := v_temp_count;
    
    -- Update appointments where this GHL user was the sales rep
    UPDATE public.appointments 
    SET sales_rep_user_id = p_app_user_id
    WHERE account_id = p_account_id 
    AND sales_rep_ghl_id = p_ghl_user_id 
    AND sales_rep_user_id IS NULL;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_appointments_updated := v_appointments_updated + v_temp_count;
    
    -- Update discoveries where this GHL user was the setter
    UPDATE public.discoveries 
    SET setter_user_id = p_app_user_id
    WHERE account_id = p_account_id 
    AND setter_ghl_id = p_ghl_user_id 
    AND setter_user_id IS NULL;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_discoveries_updated := v_temp_count;
    
    -- Update discoveries where this GHL user was the sales rep
    UPDATE public.discoveries 
    SET sales_rep_user_id = p_app_user_id
    WHERE account_id = p_account_id 
    AND sales_rep_ghl_id = p_ghl_user_id 
    AND sales_rep_user_id IS NULL;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_discoveries_updated := v_discoveries_updated + v_temp_count;
    
    -- Update dials where this GHL user was the setter (ONLY setter_user_id, no sales_rep_user_id)
    UPDATE public.dials 
    SET setter_user_id = p_app_user_id
    WHERE account_id = p_account_id 
    AND setter_ghl_id = p_ghl_user_id 
    AND setter_user_id IS NULL;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_dials_updated := v_temp_count;
    
    -- NOTE: Removed the problematic sales_rep_user_id update for dials table
    -- since dials table doesn't have a sales_rep_user_id column
    
    -- Update the ghl_users table to mark as invited
    UPDATE public.ghl_users 
    SET 
        app_user_id = p_app_user_id,
        is_invited = true,
        invited_at = NOW(),
        updated_at = NOW()
    WHERE account_id = p_account_id 
    AND ghl_user_id = p_ghl_user_id;
    
    -- Return the counts
    RETURN QUERY SELECT v_appointments_updated, v_discoveries_updated, v_dials_updated;
END;
$$;

COMMENT ON FUNCTION public.backfill_user_data_on_invitation IS 'Backfills user_id fields in appointments, discoveries, and dials when a GHL user is invited to the app. Links historical data to the newly invited user. Fixed to remove sales_rep_user_id references for dials table.';

-- Grant permission
GRANT EXECUTE ON FUNCTION public.backfill_user_data_on_invitation TO authenticated; 