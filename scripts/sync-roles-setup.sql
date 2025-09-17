-- Helper script to set up and test role synchronization between profiles and account_access
-- Run this after applying the migration

-- 1. Check current role mismatches
SELECT 'BEFORE SYNC - Role Mismatches:' as status;
SELECT 
    p.email,
    p.role as profiles_role,
    aa.role as account_access_role,
    aa.account_id
FROM profiles p
JOIN account_access aa ON p.id = aa.user_id
WHERE p.role != aa.role
ORDER BY p.email;

-- 2. Apply the manual sync function to fix existing mismatches
SELECT 'RUNNING MANUAL SYNC:' as status;
SELECT * FROM manual_sync_all_roles();

-- 3. Check role sync status after fix
SELECT 'AFTER SYNC - Role Status:' as status;
SELECT * FROM role_sync_status 
WHERE sync_status != 'SYNCED' 
ORDER BY sync_status DESC, email;

-- 4. Test the trigger by updating a profile role
SELECT 'TESTING TRIGGER - Updating test user role:' as status;

-- Find a test user to update (avoid admin users)
DO $$
DECLARE
    test_user_id uuid;
    test_user_email text;
    original_role text;
    new_role text;
BEGIN
    -- Find a setter to test with
    SELECT id, email, role INTO test_user_id, test_user_email, original_role
    FROM profiles 
    WHERE role = 'setter' 
    AND id IN (SELECT user_id FROM account_access)
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Change to sales_rep temporarily
        new_role := 'sales_rep';
        
        RAISE NOTICE 'Testing with user: % (%), changing from % to %', 
            test_user_email, test_user_id, original_role, new_role;
        
        -- Update the profile role (this should trigger the sync)
        UPDATE profiles SET role = new_role::user_role WHERE id = test_user_id;
        
        -- Check if account_access was updated
        PERFORM pg_sleep(0.1); -- Small delay to ensure trigger completes
        
        -- Show the result
        RAISE NOTICE 'Profile role after update: %', (SELECT role FROM profiles WHERE id = test_user_id);
        RAISE NOTICE 'Account_access roles after update: %', 
            (SELECT string_agg(role::text, ', ') FROM account_access WHERE user_id = test_user_id);
        
        -- Revert back to original role
        UPDATE profiles SET role = original_role::user_role WHERE id = test_user_id;
        
        RAISE NOTICE 'Reverted user % back to original role %', test_user_email, original_role;
    ELSE
        RAISE NOTICE 'No suitable test user found';
    END IF;
END $$;

-- 5. Final status check
SELECT 'FINAL STATUS CHECK:' as status;
SELECT 
    sync_status,
    COUNT(*) as count
FROM role_sync_status
GROUP BY sync_status
ORDER BY sync_status;

-- 6. Show any remaining mismatches
SELECT 'REMAINING MISMATCHES (should be none):' as status;
SELECT * FROM role_sync_status 
WHERE sync_status = 'MISMATCH'
ORDER BY email; 