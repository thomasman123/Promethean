-- Update function to backfill discoveries by email/name like appointments
CREATE OR REPLACE FUNCTION link_user_to_account_and_backfill(
  p_account_id UUID,
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_role user_role DEFAULT 'setter'
) RETURNS TABLE (user_id UUID, invited BOOLEAN) AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_access account_access%ROWTYPE;
  v_user_id UUID;
  v_invited BOOLEAN := false;
BEGIN
  -- Find or create profile stub by email (if not exists). We do not create auth.users here.
  SELECT * INTO v_profile FROM profiles WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    -- Create a stub profile row with a random UUID; actual auth.users will be created on invite accept
    v_user_id := gen_random_uuid();
    INSERT INTO profiles (id, email, full_name, role, is_active)
    VALUES (v_user_id, p_email, p_full_name, p_role, true);
  ELSE
    v_user_id := v_profile.id;
  END IF;

  -- Grant or update access
  SELECT * INTO v_access FROM grant_account_access(v_user_id, p_account_id, p_role, auth.uid());

  -- Backfill existing rows by matching setter/sales_rep text to email or name
  -- Appointments
  UPDATE appointments SET setter_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (lower(setter) = lower(p_email) OR lower(setter) = lower(coalesce(p_full_name, '')))
      AND setter_user_id IS DISTINCT FROM v_user_id;

  UPDATE appointments SET sales_rep_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (lower(sales_rep) = lower(p_email) OR lower(sales_rep) = lower(coalesce(p_full_name, '')))
      AND sales_rep_user_id IS DISTINCT FROM v_user_id;

  -- Dials
  UPDATE dials SET setter_user_id = v_user_id
    WHERE (lower(setter) = lower(p_email) OR lower(setter) = lower(coalesce(p_full_name, '')))
      AND setter_user_id IS DISTINCT FROM v_user_id;

  -- Discoveries (new)
  UPDATE discoveries SET setter_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (lower(setter) = lower(p_email) OR lower(setter) = lower(coalesce(p_full_name, '')))
      AND setter_user_id IS DISTINCT FROM v_user_id;

  UPDATE discoveries SET sales_rep_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (lower(sales_rep) = lower(p_email) OR lower(sales_rep) = lower(coalesce(p_full_name, '')))
      AND sales_rep_user_id IS DISTINCT FROM v_user_id;

  RETURN QUERY SELECT v_user_id, v_invited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 