-- Function to grant user access to an account
CREATE OR REPLACE FUNCTION grant_account_access(
  user_id UUID,
  account_id UUID,
  role user_role DEFAULT 'setter',
  granted_by_user_id UUID DEFAULT NULL
)
RETURNS account_access AS $$
DECLARE
  access_record account_access;
BEGIN
  INSERT INTO account_access (user_id, account_id, role, granted_by)
  VALUES (user_id, account_id, role, granted_by_user_id)
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

-- Function to revoke user access from an account
CREATE OR REPLACE FUNCTION revoke_account_access(
  user_id UUID,
  account_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE account_access 
  SET is_active = false, updated_at = NOW()
  WHERE account_access.user_id = revoke_account_access.user_id 
    AND account_access.account_id = revoke_account_access.account_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible accounts
CREATE OR REPLACE FUNCTION get_user_accounts(user_id UUID)
RETURNS TABLE (
  account_id UUID,
  account_name VARCHAR(255),
  account_description TEXT,
  user_role user_role,
  granted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.description,
    aa.role,
    aa.granted_at
  FROM accounts a
  JOIN account_access aa ON a.id = aa.account_id
  WHERE aa.user_id = get_user_accounts.user_id 
    AND aa.is_active = true 
    AND a.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the new user trigger to automatically grant access to the first account
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    -- Grant access to the first account (for demo purposes)
    -- In production, this should be handled by an admin
    PERFORM grant_account_access(
      NEW.id, 
      '01234567-0123-4567-8901-000000000001'::UUID, 
      'setter'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
