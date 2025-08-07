-- Clean up ALL remaining recursive policies

-- Drop ALL existing policies on account_access table to start fresh
DROP POLICY IF EXISTS "Users can read own account access" ON account_access;
DROP POLICY IF EXISTS "Moderators can read account access for their accounts" ON account_access;
DROP POLICY IF EXISTS "Users can insert own account access" ON account_access;

-- Also drop any remaining problematic policies that might still exist
DROP POLICY IF EXISTS "Admins can read all account access" ON account_access;
DROP POLICY IF EXISTS "Admins can insert account access" ON account_access;
DROP POLICY IF EXISTS "Admins can update account access" ON account_access;
DROP POLICY IF EXISTS "Admins can delete account access" ON account_access;
DROP POLICY IF EXISTS "Moderators can insert account access for their accounts" ON account_access;
DROP POLICY IF EXISTS "Moderators can update account access for their accounts" ON account_access;
DROP POLICY IF EXISTS "Moderators can delete account access for their accounts" ON account_access;

-- Check if the temporary policy already exists, if not create it
DO $$
BEGIN
    -- Try to drop the policy first in case it exists
    BEGIN
        DROP POLICY "Temporary: Allow authenticated users to read account_access" ON account_access;
    EXCEPTION
        WHEN undefined_object THEN
            -- Policy doesn't exist, that's fine
            NULL;
    END;
    
    -- Now create the policy
    CREATE POLICY "Temporary: Allow authenticated users to read account_access" ON account_access
        FOR SELECT USING (auth.role() = 'authenticated');
END
$$;

-- Add all the missing CRUD policies for account_access (non-recursive)
-- Drop first in case they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert account_access" ON account_access;
DROP POLICY IF EXISTS "Allow authenticated users to update account_access" ON account_access;
DROP POLICY IF EXISTS "Allow authenticated users to delete account_access" ON account_access;

-- Now create them
CREATE POLICY "Allow authenticated users to insert account_access" ON account_access
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update account_access" ON account_access
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete account_access" ON account_access
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also ensure profiles policies are clean (these shouldn't have recursion but let's be sure)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- List all current policies for debugging (this will show in the migration output)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('accounts', 'account_access', 'profiles')
ORDER BY tablename, policyname; 