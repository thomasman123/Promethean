-- Fix RLS policies for account_access table to allow admins to manage user access
-- Run this in your Supabase SQL editor (handles existing policies)

-- Drop ALL existing policies on account_access table
DROP POLICY IF EXISTS simple_insert_policy ON account_access;
DROP POLICY IF EXISTS simple_update_policy ON account_access;
DROP POLICY IF EXISTS simple_delete_policy ON account_access;
DROP POLICY IF EXISTS admin_insert_policy ON account_access;
DROP POLICY IF EXISTS admin_update_policy ON account_access;
DROP POLICY IF EXISTS admin_delete_policy ON account_access;
DROP POLICY IF EXISTS users_read_own ON account_access;
DROP POLICY IF EXISTS users_read_own_access ON account_access;

-- Create new comprehensive policies
CREATE POLICY admin_read_policy ON account_access
  FOR SELECT 
  TO public
  USING (
    user_id = auth.uid() OR -- Users can read their own access
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY admin_insert_policy ON account_access
  FOR INSERT 
  TO public
  WITH CHECK (
    user_id = auth.uid() OR -- Users can manage their own access
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY admin_update_policy ON account_access
  FOR UPDATE 
  TO public
  USING (
    user_id = auth.uid() OR -- Users can manage their own access
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY admin_delete_policy ON account_access
  FOR DELETE 
  TO public
  USING (
    user_id = auth.uid() OR -- Users can manage their own access
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'account_access'
ORDER BY policyname; 