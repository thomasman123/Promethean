-- Debug and fix RLS policies
-- Since user has admin role but still getting errors, let's add more permissive policies for testing

-- First, let's add a temporary policy that allows any authenticated user to read profiles
-- This will help us debug if the issue is with the admin role check
CREATE POLICY "Temporary: Allow authenticated users to read profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add a more permissive policy for accounts table for debugging
CREATE POLICY "Temporary: Allow authenticated users to read accounts" ON accounts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary: Allow authenticated users to insert accounts" ON accounts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add more permissive policy for account_access for debugging
CREATE POLICY "Temporary: Allow authenticated users to read account_access" ON account_access
    FOR SELECT USING (auth.role() = 'authenticated');

-- Let's also check if auth.uid() is working properly by creating a test function
CREATE OR REPLACE FUNCTION test_auth_context()
RETURNS TABLE (
    current_user_id UUID,
    current_user_role TEXT,
    user_exists_in_profiles BOOLEAN,
    user_role_in_profiles TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as current_user_id,
        auth.role() as current_user_role,
        EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()) as user_exists_in_profiles,
        (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) as user_role_in_profiles;
END;
$$;

-- Grant execute permission on the test function
GRANT EXECUTE ON FUNCTION test_auth_context() TO authenticated; 