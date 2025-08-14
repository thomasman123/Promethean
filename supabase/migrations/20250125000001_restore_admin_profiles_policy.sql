-- Restore admin policy for profiles that was accidentally dropped
-- This is needed for admin users to access their own profile and others

-- First check if the policy exists, if not create it
DO $$
BEGIN
    -- Check if the admin profiles policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Admins can read all profiles'
    ) THEN
        -- Create the admin policy
        CREATE POLICY "Admins can read all profiles" ON profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$;

-- Also ensure appointments policy allows admin access
DO $$
BEGIN
    -- Check if admin appointments policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'appointments' 
        AND policyname = 'Admins can read all appointments'
    ) THEN
        -- Create admin appointments policy
        CREATE POLICY "Admins can read all appointments" ON appointments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$;

-- Ensure account_access allows admins
DO $$
BEGIN
    -- Check if admin account_access policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'account_access' 
        AND policyname = 'Admins can read all account_access'
    ) THEN
        -- Create admin account_access policy
        CREATE POLICY "Admins can read all account_access" ON account_access
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$; 