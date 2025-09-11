-- Fix account_access roles to match actual user functions based on data
-- This corrects the massive role mismatches between account_access and actual activity

-- Update account_access roles based on actual appointment/dial activity
UPDATE account_access SET 
  role = CASE 
    -- If user has significant sales rep activity, make them sales_rep
    WHEN (
      SELECT COUNT(*) 
      FROM appointments a 
      WHERE a.sales_rep_user_id = account_access.user_id 
        AND a.account_id = account_access.account_id
    ) > 10 THEN 'sales_rep'
    
    -- If user has any sales rep activity at all, make them sales_rep
    WHEN (
      SELECT COUNT(*) 
      FROM appointments a 
      WHERE a.sales_rep_user_id = account_access.user_id 
        AND a.account_id = account_access.account_id
    ) > 0 THEN 'sales_rep'
    
    -- Otherwise keep as setter (or existing admin/moderator roles)
    WHEN role IN ('admin', 'moderator') THEN role
    ELSE 'setter'
  END,
  updated_at = NOW()
WHERE EXISTS (
  -- Only update if user has appointment or dial activity
  SELECT 1 FROM appointments a 
  WHERE (a.setter_user_id = account_access.user_id OR a.sales_rep_user_id = account_access.user_id)
    AND a.account_id = account_access.account_id
  
  UNION
  
  SELECT 1 FROM dials d
  WHERE d.setter_user_id = account_access.user_id
    AND d.account_id = account_access.account_id
);

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % account_access roles based on actual activity data', updated_count;
END $$; 