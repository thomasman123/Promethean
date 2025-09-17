-- Fix profile roles to match account roles for users with mismatched roles
-- This ensures consistency between profile.role and account_access.role

-- Update profile roles to match their primary account role
UPDATE profiles 
SET role = (
  SELECT CASE 
    WHEN aa.role IN ('sales_rep', 'moderator', 'admin') THEN aa.role
    ELSE 'setter'
  END
  FROM account_access aa
  WHERE aa.user_id = profiles.id 
    AND aa.is_active = true
  ORDER BY 
    CASE aa.role 
      WHEN 'admin' THEN 1
      WHEN 'moderator' THEN 2  
      WHEN 'sales_rep' THEN 3
      ELSE 4
    END
  LIMIT 1
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM account_access aa
  WHERE aa.user_id = profiles.id 
    AND aa.is_active = true
    AND aa.role != profiles.role
    AND aa.role IN ('sales_rep', 'moderator', 'admin')
);

-- Log the changes for verification
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % profile roles to match account roles', updated_count;
END $$; 