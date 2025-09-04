-- Fix infinite recursion in account_access policies by using helper function
-- This migration drops the recursive policy and replaces it with a safe implementation.

-- 1. Drop the old recursive policy if it exists
DROP POLICY IF EXISTS "users_read_same_account" ON account_access;
DROP POLICY IF EXISTS "Users can read account access for shared accounts" ON account_access;

-- 2. Create helper function that returns the list of account IDs the given user has access to.
--    The function runs with SECURITY DEFINER so it bypasses RLS and therefore avoids recursion.
CREATE OR REPLACE FUNCTION public.user_account_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(account_id), ARRAY[]::uuid[])
  FROM account_access
  WHERE user_id = p_user_id
    AND is_active = true;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_account_ids(uuid) TO authenticated;

-- 4. Create the new non-recursive policy using the helper function
CREATE POLICY "users_read_same_account_v2" ON account_access
    FOR SELECT
    USING (
        account_access.account_id = ANY (public.user_account_ids(auth.uid()))
    );

-- 5. Ensure users can still read their own records (reinstate if necessary)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'account_access' AND policyname = 'users_read_own'
    ) THEN
        CREATE POLICY "users_read_own" ON account_access
            FOR SELECT
            USING (user_id = auth.uid());
    END IF;
END $$; 