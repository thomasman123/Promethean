-- EMERGENCY FIX: Remove infinite recursion in RLS policies
-- Run this IMMEDIATELY in Supabase SQL editor

-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS admin_read_policy ON account_access;
DROP POLICY IF EXISTS admin_insert_policy ON account_access;
DROP POLICY IF EXISTS admin_update_policy ON account_access;
DROP POLICY IF EXISTS admin_delete_policy ON account_access;
DROP POLICY IF EXISTS allow_read_account_access ON account_access;
DROP POLICY IF EXISTS allow_insert_account_access ON account_access;
DROP POLICY IF EXISTS allow_update_account_access ON account_access;
DROP POLICY IF EXISTS allow_delete_account_access ON account_access;

-- Create a security definer function that can check admin role without RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Create simple, non-recursive policies using the security definer function
CREATE POLICY account_access_select_policy ON account_access
  FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY account_access_insert_policy ON account_access
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY account_access_update_policy ON account_access
  FOR UPDATE 
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY account_access_delete_policy ON account_access
  FOR DELETE 
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'account_access'
ORDER BY policyname; 