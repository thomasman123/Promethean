-- Restore basic account data after clearing everything
-- This creates fresh accounts for testing and development

-- Insert some basic accounts
INSERT INTO accounts (id, name, description, is_active, business_timezone) VALUES
  ('83cededf-914f-4d90-b9b3-917475f7e9d8', 'Demo Account 1', 'Primary demo account for testing', true, 'America/New_York'),
  ('3c1ca70c-c360-447f-8ff4-0fc4eff4addb', 'Demo Account 2', 'Secondary demo account for testing', true, 'America/Los_Angeles'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Test Agency', 'Test agency account', true, 'UTC'),
  ('f1e2d3c4-b5a6-9876-5432-109876543210', 'Sample Business', 'Sample business account', true, 'America/Chicago');

-- Restore account access for the admin user (thomas@heliosscale.com)
-- First, let's make sure the admin user exists in profiles
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
  is_active = true; 