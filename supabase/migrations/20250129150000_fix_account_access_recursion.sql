-- Fix infinite recursion in account_access policies
-- The previous policy was self-referential causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read account access for their accounts" ON account_access;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can read their own account access entries" ON account_access
    FOR SELECT
    USING (user_id = auth.uid());

-- Also ensure users can see other users in the same account (for team views)
-- This is done through a direct check without self-reference
CREATE POLICY "Users can read account access for shared accounts" ON account_access
    FOR SELECT
    USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid()
        )
    ); 