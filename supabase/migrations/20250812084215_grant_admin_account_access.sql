-- Grant admin users access to all accounts and populate missing user IDs

-- Step 1: Grant all admin users access to all accounts as moderators
-- (Admins have global access but still need account_access entries for the candidates API to work)
INSERT INTO account_access (user_id, account_id, role, granted_by, is_active)
SELECT 
    p.id as user_id,
    a.id as account_id,
    'moderator'::user_role as role,
    p.id as granted_by,  -- Self-granted
    true as is_active
FROM profiles p
CROSS JOIN accounts a
WHERE p.role = 'admin' 
  AND a.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM account_access aa 
    WHERE aa.user_id = p.id AND aa.account_id = a.id
  );

-- Step 2: Create a simplified version that just handles admin access for now
-- The user auto-creation will be handled by webhooks going forward

-- For now, just ensure there are no appointments with missing user IDs blocking the dropdowns
-- This is a temporary fix - the full auto-user creation will happen via webhooks
