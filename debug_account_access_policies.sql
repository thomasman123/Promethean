-- 1. First, let's see what policies currently exist on account_access
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'account_access'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'account_access';

-- 3. NUCLEAR OPTION: Drop ALL policies and recreate them
-- Run this to completely fix the issue:

-- First, drop all existing policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'account_access'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.account_access', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Create a single, simple policy for reading
CREATE POLICY "simple_read_policy" ON public.account_access
    FOR SELECT
    USING (
        user_id = auth.uid() 
        OR 
        account_id IN (
            SELECT aa2.account_id 
            FROM public.account_access aa2 
            WHERE aa2.user_id = auth.uid()
            LIMIT 1000  -- Prevent any potential infinite loops
        )
    );

-- Create simple policies for other operations
CREATE POLICY "simple_insert_policy" ON public.account_access
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "simple_update_policy" ON public.account_access
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "simple_delete_policy" ON public.account_access
    FOR DELETE
    USING (user_id = auth.uid());

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_access TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.data_tables TO authenticated;

-- 5. Test the policies with a simple query
-- Replace 'YOUR_USER_ID' with an actual user ID from your system
/*
SELECT * FROM public.account_access 
WHERE user_id = 'YOUR_USER_ID'
LIMIT 10;
*/

-- 6. Alternative: Temporarily disable RLS (for testing only!)
-- ALTER TABLE public.account_access DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable it after testing:
-- ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY; 