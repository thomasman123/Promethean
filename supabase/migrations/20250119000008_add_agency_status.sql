-- Add agency status to accounts table for unlimited seat access
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS is_agency BOOLEAN DEFAULT FALSE;

-- Add index for agency accounts
CREATE INDEX IF NOT EXISTS idx_accounts_is_agency ON public.accounts(is_agency);

-- Add comment
COMMENT ON COLUMN public.accounts.is_agency IS 'Indicates if this account has agency status with unlimited seat access';

-- Update RLS policies to ensure only admins can modify agency status
-- (The existing policies should already cover this, but we'll be explicit)

-- Add a function for admins to toggle agency status
CREATE OR REPLACE FUNCTION public.toggle_account_agency_status(
    p_account_id UUID,
    p_is_agency BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Check if the current user is a global admin
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only global admins can modify agency status';
    END IF;
    
    -- Update the account's agency status
    UPDATE public.accounts
    SET 
        is_agency = p_is_agency,
        updated_at = NOW()
    WHERE id = p_account_id;
    
    IF FOUND THEN
        RETURN true;
    ELSE
        RAISE EXCEPTION 'Account not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS will handle admin check)
GRANT EXECUTE ON FUNCTION public.toggle_account_agency_status TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.toggle_account_agency_status IS 'Allows global admins to toggle agency status for accounts, granting unlimited seat access'; 