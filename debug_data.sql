-- Debug current data state to understand dropdown issue

-- Check what appointments exist and their setter/rep data
SELECT 
  id, 
  setter, 
  sales_rep, 
  setter_user_id, 
  sales_rep_user_id, 
  account_id, 
  contact_name,
  date_booked_for
FROM appointments 
ORDER BY created_at DESC 
LIMIT 10;

-- Check what profiles exist
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  created_for_data,
  created_at
FROM profiles 
ORDER BY created_at DESC;

-- Check account access (should show who has access to which accounts)
SELECT 
  user_id,
  account_id, 
  role,
  is_active,
  granted_at
FROM account_access 
WHERE is_active = true;

-- Check what accounts exist
SELECT 
  id,
  name,
  is_active
FROM accounts
WHERE is_active = true;

-- Show team_members view (this is what the API uses)
SELECT 
  account_id,
  user_id,
  email,
  full_name,
  role,
  created_for_data,
  granted_at
FROM team_members; 