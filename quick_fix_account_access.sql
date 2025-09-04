-- QUICK FIX: Temporarily bypass the recursion issue
-- Run this in Supabase SQL Editor

-- Option 1: Create a view that bypasses RLS
CREATE OR REPLACE VIEW public.account_access_view AS
SELECT * FROM public.account_access;

-- Grant access to the view
GRANT SELECT ON public.account_access_view TO authenticated;

-- Option 2: Create a function that returns account access data
CREATE OR REPLACE FUNCTION get_account_users(p_account_id UUID)
RETURNS TABLE (
    user_id UUID,
    account_id UUID,
    role text,
    email text,
    full_name text
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aa.user_id,
        aa.account_id,
        p.role::text,
        p.email::text,
        p.full_name::text
    FROM public.account_access aa
    JOIN public.profiles p ON p.id = aa.user_id
    WHERE aa.account_id = p_account_id
    AND EXISTS (
        SELECT 1 FROM public.account_access aa2 
        WHERE aa2.user_id = auth.uid() 
        AND aa2.account_id = p_account_id
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_users(UUID) TO authenticated;

-- Option 3: If nothing else works, temporarily disable RLS
-- WARNING: This removes all access control! Only for debugging!
-- ALTER TABLE public.account_access DISABLE ROW LEVEL SECURITY;

-- To re-enable later:
-- ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY; 