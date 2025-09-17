-- EMERGENCY FIX: Remove infinite recursion in RLS policies
-- Run this IMMEDIATELY in Supabase SQL editor

-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS admin_read_policy ON account_access;
DROP POLICY IF EXISTS admin_insert_policy ON account_access;
DROP POLICY IF EXISTS admin_update_policy ON account_access;
DROP POLICY IF EXISTS admin_delete_policy ON account_access;

-- Create simple, non-recursive policies
-- Allow all authenticated users to read account_access (no recursion)
CREATE POLICY allow_read_account_access ON account_access
  FOR SELECT 
  TO authenticated
  USING (true);

-- Allow users to insert their own records OR if they have admin role in profiles table
-- Use a direct role check without subquery to avoid recursion
CREATE POLICY allow_insert_account_access ON account_access
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Allow users to update their own records OR admins to update any
CREATE POLICY allow_update_account_access ON account_access
  FOR UPDATE 
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Allow users to delete their own records OR admins to delete any
CREATE POLICY allow_delete_account_access ON account_access
  FOR DELETE 
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'account_access'
ORDER BY policyname; 