-- Debug script to check and fix user role issues

-- 1. Check if thomas@heliosscale.com exists in profiles
SELECT 'Current user status:' as info;
SELECT id, email, full_name, role, is_active, created_at 
FROM profiles 
WHERE email = 'thomas@heliosscale.com';

-- 2. Check all users in profiles table
SELECT 'All users in profiles:' as info;
SELECT id, email, full_name, role, is_active 
FROM profiles 
ORDER BY created_at DESC;

-- 3. Check auth.users table to see if the user exists there
SELECT 'Users in auth.users:' as info;
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 4. Update thomas@heliosscale.com to admin if exists
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'thomas@heliosscale.com';

-- 5. If no rows were updated, let's try to find the user by a different method
-- Check if there's a user with similar email
SELECT 'Users with similar email:' as info;
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE email ILIKE '%thomas%' OR email ILIKE '%heliosscale%';

-- 6. Show the result after update
SELECT 'User status after update:' as info;
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE email = 'thomas@heliosscale.com' OR email ILIKE '%thomas%' OR email ILIKE '%heliosscale%'; 