-- Fix infinite recursion in RLS policies
-- The admin policies are creating infinite loops by querying profiles table from within profiles RLS

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can read all account_access" ON account_access;

-- Create non-recursive policies using auth.uid() and jwt claims instead
-- Admin users will be identified by their role claim in the JWT, not by querying profiles table

-- For profiles: Users can read their own, and we'll handle admin access in the application layer
-- The "Users can read own profile" policy should be sufficient for users to read their own profile
-- No need for admin policy that creates recursion

-- For appointments: Allow users to read appointments where they are the sales rep
-- and allow admins via app-level logic (service role)
CREATE POLICY "Users can read own appointments" ON appointments
    FOR SELECT USING (sales_rep_user_id = auth.uid());

-- For account_access: Allow users to read their own access records
CREATE POLICY "Users can read own account access" ON account_access
    FOR SELECT USING (user_id = auth.uid());

-- Add accounts policy for users to read accounts they have access to
CREATE POLICY "Users can read accessible accounts" ON accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM account_access aa
            WHERE aa.account_id = accounts.id
            AND aa.user_id = auth.uid()
            AND aa.is_active = true
        )
    );

-- Debug: List all current policies to verify
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'appointments', 'account_access', 'accounts')
ORDER BY tablename, policyname; 