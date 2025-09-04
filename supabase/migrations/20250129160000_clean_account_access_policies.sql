-- Complete cleanup and fix of account_access policies to resolve infinite recursion
-- Drop ALL existing policies first to start fresh

DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop all existing policies on account_access
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'account_access'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON account_access', pol.policyname);
    END LOOP;
END $$;

-- Create simple, non-recursive policies

-- 1. Users can see their own account_access records
CREATE POLICY "users_read_own" ON account_access
    FOR SELECT
    USING (user_id = auth.uid());

-- 2. Users can see other users in the same account (using a CTE to avoid recursion)
CREATE POLICY "users_read_same_account" ON account_access
    FOR SELECT
    USING (
        EXISTS (
            WITH user_accounts AS (
                SELECT account_id 
                FROM account_access 
                WHERE user_id = auth.uid()
            )
            SELECT 1 
            FROM user_accounts 
            WHERE user_accounts.account_id = account_access.account_id
        )
    );

-- 3. Users can insert their own records
CREATE POLICY "users_insert_own" ON account_access
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 4. Users can update their own records
CREATE POLICY "users_update_own" ON account_access
    FOR UPDATE
    USING (user_id = auth.uid());

-- 5. Users can delete their own records
CREATE POLICY "users_delete_own" ON account_access
    FOR DELETE
    USING (user_id = auth.uid()); 