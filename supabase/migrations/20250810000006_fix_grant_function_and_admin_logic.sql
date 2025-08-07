-- Fix the grant_account_access function to resolve ambiguous column reference
-- and add business logic to prevent admins from being assigned to accounts

-- Drop the existing function first to change parameter names
DROP FUNCTION IF EXISTS grant_account_access(UUID, UUID, user_role, UUID);

CREATE OR REPLACE FUNCTION grant_account_access(
  p_user_id UUID,
  p_account_id UUID,
  p_role user_role DEFAULT 'setter',
  p_granted_by_user_id UUID DEFAULT NULL
)
RETURNS account_access AS $$
DECLARE
  access_record account_access;
  user_current_role user_role;
BEGIN
  -- Check if the user being assigned is an admin
  SELECT role INTO user_current_role 
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Prevent admins from being assigned to accounts (admin is app-wide)
  IF user_current_role = 'admin' THEN
    RAISE EXCEPTION 'Admin users cannot be assigned to specific accounts. Admin role is app-wide.';
  END IF;
  
  -- Prevent assigning admin role to accounts (admin is app-wide only)
  IF p_role = 'admin' THEN
    RAISE EXCEPTION 'Admin role cannot be assigned to accounts. Admin role is app-wide only.';
  END IF;
  
  INSERT INTO account_access (user_id, account_id, role, granted_by)
  VALUES (p_user_id, p_account_id, p_role, p_granted_by_user_id)
  ON CONFLICT (user_id, account_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    granted_by = EXCLUDED.granted_by,
    granted_at = NOW(),
    is_active = true
  RETURNING * INTO access_record;
  
  RETURN access_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 