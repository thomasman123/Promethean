-- Fix account_access read permissions for data view page
-- Ensure authenticated users can read account_access entries they belong to

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to read account_access" ON account_access;
DROP POLICY IF EXISTS "Users can read own account access" ON account_access;

-- Create a comprehensive read policy
CREATE POLICY "Users can read account access for their accounts" ON account_access
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM account_access aa
            WHERE aa.user_id = auth.uid()
            AND aa.account_id = account_access.account_id
        )
    );

-- Ensure profiles can be read through account_access join
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON account_access TO authenticated; 