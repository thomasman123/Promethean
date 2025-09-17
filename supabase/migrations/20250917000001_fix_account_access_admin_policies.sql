-- Add admin policies for account_access table to allow admins to manage user access

-- Drop existing simple policies that are too restrictive
DROP POLICY IF EXISTS simple_insert_policy ON account_access;
DROP POLICY IF EXISTS simple_update_policy ON account_access;
DROP POLICY IF EXISTS simple_delete_policy ON account_access;

-- Create new policies that allow admins to manage any user's access
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