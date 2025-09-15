-- Fix account access issues after September 15 data wipe
-- The main issue is that account_access records were deleted but not restored properly

-- First, ensure the admin user profile exists and has correct role
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'admin'::user_role,
  true
FROM auth.users 
WHERE email = 'thomas@heliosscale.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::user_role,
  is_active = true;

-- Grant admin access to all accounts for the primary admin user
INSERT INTO account_access (user_id, account_id, role, granted_by, is_active)
SELECT 
  u.id as user_id,
  a.id as account_id,
  'moderator'::user_role as role,
  u.id as granted_by,
  true as is_active
FROM auth.users u
CROSS JOIN accounts a
WHERE u.email = 'thomas@heliosscale.com'
ON CONFLICT (user_id, account_id) DO UPDATE SET
  role = 'moderator'::user_role,
  is_active = true,
  updated_at = NOW();

-- Verify the fix worked
DO $$
DECLARE
    access_count integer;
    account_count integer;
BEGIN
    SELECT COUNT(*) INTO access_count FROM account_access 
    WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'thomas@heliosscale.com')
    AND is_active = true;
    
    SELECT COUNT(*) INTO account_count FROM accounts WHERE is_active = true;
    
    RAISE NOTICE 'Admin user now has access to % out of % active accounts', access_count, account_count;
END $$; 