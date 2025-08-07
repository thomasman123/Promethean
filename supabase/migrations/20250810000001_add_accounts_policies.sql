-- Add RLS policies for the accounts table
-- These were missing, causing access issues

-- Allow admins to read all accounts
CREATE POLICY "Admins can read all accounts" ON accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow moderators to read accounts they have access to
CREATE POLICY "Moderators can read accessible accounts" ON accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM account_access aa
            WHERE aa.user_id = auth.uid() 
            AND aa.account_id = accounts.id
            AND aa.role IN ('admin', 'moderator')
            AND aa.is_active = true
        )
    );

-- Allow admins to create new accounts
CREATE POLICY "Admins can create accounts" ON accounts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update accounts
CREATE POLICY "Admins can update accounts" ON accounts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to delete accounts (set inactive)
CREATE POLICY "Admins can delete accounts" ON accounts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add policy for moderators to update accounts they have moderator access to
CREATE POLICY "Moderators can update accessible accounts" ON accounts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM account_access aa
            WHERE aa.user_id = auth.uid() 
            AND aa.account_id = accounts.id
            AND aa.role IN ('admin', 'moderator')
            AND aa.is_active = true
        )
    );

-- Add policies for account_access table to allow admins full control
CREATE POLICY "Admins can read all account access" ON account_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert account access" ON account_access
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update account access" ON account_access
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete account access" ON account_access
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Also add policies to allow moderators to manage account access for their accounts
CREATE POLICY "Moderators can insert account access for their accounts" ON account_access
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM account_access aa2
            WHERE aa2.user_id = auth.uid() 
            AND aa2.account_id = account_access.account_id
            AND aa2.role IN ('admin', 'moderator')
            AND aa2.is_active = true
        )
    );

CREATE POLICY "Moderators can update account access for their accounts" ON account_access
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM account_access aa2
            WHERE aa2.user_id = auth.uid() 
            AND aa2.account_id = account_access.account_id
            AND aa2.role IN ('admin', 'moderator')
            AND aa2.is_active = true
        )
    );

CREATE POLICY "Moderators can delete account access for their accounts" ON account_access
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM account_access aa2
            WHERE aa2.user_id = auth.uid() 
            AND aa2.account_id = account_access.account_id
            AND aa2.role IN ('admin', 'moderator')
            AND aa2.is_active = true
        )
    ); 