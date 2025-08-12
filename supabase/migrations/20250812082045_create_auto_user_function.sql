-- Function to auto-create user profiles for data linking purposes
-- This will be called from webhooks when new setter/rep names appear in data
CREATE OR REPLACE FUNCTION create_data_user_if_not_exists(
  p_account_id UUID,
  p_name VARCHAR(255),
  p_role user_role,
  p_email VARCHAR(255) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_email VARCHAR(255);
BEGIN
  -- Generate email if not provided (using name + account domain)
  IF p_email IS NULL THEN
    v_email := lower(replace(p_name, ' ', '.')) || '+data@promethean.ai';
  ELSE
    v_email := p_email;
  END IF;

  -- Check if a profile already exists with this name for this account
  SELECT p.id INTO v_user_id
  FROM profiles p
  JOIN account_access aa ON aa.user_id = p.id
  WHERE aa.account_id = p_account_id
    AND aa.is_active = true
    AND (p.full_name = p_name OR p.email = v_email);

  -- If user doesn't exist, create them
  IF v_user_id IS NULL THEN
    -- Generate a UUID for the profile (without creating auth.users entry)
    v_user_id := gen_random_uuid();
    
    -- Create profile marked as data-created
    INSERT INTO profiles (id, email, full_name, role, created_for_data, is_active)
    VALUES (v_user_id, v_email, p_name, p_role, true, true);
    
    -- Grant account access
    INSERT INTO account_access (user_id, account_id, role, granted_by, is_active)
    VALUES (v_user_id, p_account_id, p_role, NULL, true);
    
    RAISE NOTICE 'Created data user: % (%) for account %', p_name, v_email, p_account_id;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert a data-created user to a real invited user
CREATE OR REPLACE FUNCTION convert_data_user_to_invited(
  p_user_id UUID,
  p_real_email VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  -- Get the profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id AND created_for_data = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or not a data-created user';
  END IF;
  
  -- Update profile to use real email and mark as not data-created
  UPDATE profiles 
  SET email = p_real_email, 
      created_for_data = false,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_data_user_if_not_exists(UUID, VARCHAR, user_role, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_data_user_to_invited(UUID, VARCHAR) TO authenticated;
