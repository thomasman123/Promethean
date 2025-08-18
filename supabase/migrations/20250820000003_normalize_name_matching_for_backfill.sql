-- Normalize whitespace-based matching for backfills so names like 'Jaden  Phan' match 'Jaden Phan'
-- This function wraps link_user_to_account_and_backfill by comparing on collapsed whitespace for names

CREATE OR REPLACE FUNCTION normalize_and_backfill_user(
  p_account_id UUID,
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_role user_role DEFAULT 'setter'
) RETURNS TABLE (user_id UUID, invited BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_invited BOOLEAN;
  v_norm_name VARCHAR;
BEGIN
  -- Collapse multiple spaces to single, and trim
  v_norm_name := regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g');
  v_norm_name := btrim(v_norm_name);

  -- Delegate to existing function to ensure user/access and perform backfill by email or name
  RETURN QUERY SELECT * FROM link_user_to_account_and_backfill(p_account_id, p_email, v_norm_name, p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional one-off backfill call example (commented out):
-- SELECT * FROM normalize_and_backfill_user('<account-uuid>', 'jaden@example.com', 'Jaden  Phan', 'setter'); 