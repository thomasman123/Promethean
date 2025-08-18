-- Update backfill function to normalize whitespace when comparing names
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
  v_norm_full_name VARCHAR;
BEGIN
  -- Normalize provided full name: collapse multi-spaces and trim
  v_norm_full_name := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));

  -- Find or create profile stub by email (if not exists). We do not create auth.users here.
  SELECT * INTO v_profile FROM profiles WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    v_user_id := gen_random_uuid();
    INSERT INTO profiles (id, email, full_name, role, is_active)
    VALUES (v_user_id, p_email, v_norm_full_name, p_role, true);
  ELSE
    v_user_id := v_profile.id;
  END IF;

  -- Grant or update access
  SELECT * INTO v_access FROM grant_account_access(v_user_id, p_account_id, p_role, auth.uid());

  -- Backfill existing rows by matching setter/sales_rep text to email or normalized name
  -- Appointments
  UPDATE appointments SET setter_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (
        lower(setter) = lower(p_email) OR
        btrim(regexp_replace(lower(coalesce(setter, '')), '\s+', ' ', 'g')) = lower(coalesce(v_norm_full_name, ''))
      )
      AND setter_user_id IS DISTINCT FROM v_user_id;

  UPDATE appointments SET sales_rep_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (
        lower(sales_rep) = lower(p_email) OR
        btrim(regexp_replace(lower(coalesce(sales_rep, '')), '\s+', ' ', 'g')) = lower(coalesce(v_norm_full_name, ''))
      )
      AND sales_rep_user_id IS DISTINCT FROM v_user_id;

  -- Dials (no account_id column in prior schema filter, so match globally by name/email)
  UPDATE dials SET setter_user_id = v_user_id
    WHERE (
      lower(setter) = lower(p_email) OR
      btrim(regexp_replace(lower(coalesce(setter, '')), '\s+', ' ', 'g')) = lower(coalesce(v_norm_full_name, ''))
    )
    AND setter_user_id IS DISTINCT FROM v_user_id;

  -- Discoveries
  UPDATE discoveries SET setter_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (
        lower(setter) = lower(p_email) OR
        btrim(regexp_replace(lower(coalesce(setter, '')), '\s+', ' ', 'g')) = lower(coalesce(v_norm_full_name, ''))
      )
      AND setter_user_id IS DISTINCT FROM v_user_id;

  UPDATE discoveries SET sales_rep_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (
        lower(sales_rep) = lower(p_email) OR
        btrim(regexp_replace(lower(coalesce(sales_rep, '')), '\s+', ' ', 'g')) = lower(coalesce(v_norm_full_name, ''))
      )
      AND sales_rep_user_id IS DISTINCT FROM v_user_id;

  RETURN QUERY SELECT v_user_id, v_invited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 