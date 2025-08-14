-- Add missing CRUD policies for appointments and other tables
-- Users need to be able to UPDATE their own appointments (for outcome updates)

-- Appointments UPDATE policy - users can update appointments where they are the sales rep
CREATE POLICY "Users can update own appointments" ON appointments
    FOR UPDATE USING (sales_rep_user_id = auth.uid());

-- Appointments INSERT policy - in case we need it for creating appointments
CREATE POLICY "Users can insert appointments" ON appointments
    FOR INSERT WITH CHECK (sales_rep_user_id = auth.uid());

-- Profiles UPDATE policy - users can update their own profile
-- (this should already exist but let's ensure it's there)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Account access UPDATE policy - for updating roles (if needed)
CREATE POLICY "Users can update own account access" ON account_access
    FOR UPDATE USING (user_id = auth.uid());

-- Debug: Check all policies for core tables
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'READ'
        WHEN cmd = 'INSERT' THEN 'CREATE' 
        WHEN cmd = 'UPDATE' THEN 'UPDATE'
        WHEN cmd = 'DELETE' THEN 'DELETE'
        ELSE cmd
    END as operation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('appointments', 'profiles', 'account_access')
ORDER BY tablename, cmd, policyname; 