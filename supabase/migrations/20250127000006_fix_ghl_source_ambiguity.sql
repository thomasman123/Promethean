-- Fix ambiguous column reference in get_unmapped_sources function
CREATE OR REPLACE FUNCTION get_unmapped_sources(p_account_id UUID)
RETURNS TABLE(ghl_source VARCHAR(100)) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT a.ghl_source
  FROM (
    SELECT DISTINCT appointments.ghl_source FROM appointments 
    WHERE appointments.account_id = p_account_id AND appointments.ghl_source IS NOT NULL
    UNION
    SELECT DISTINCT discoveries.ghl_source FROM discoveries 
    WHERE discoveries.account_id = p_account_id AND discoveries.ghl_source IS NOT NULL
  ) a
  LEFT JOIN ghl_source_mappings m 
    ON m.account_id = p_account_id AND m.ghl_source = a.ghl_source
  WHERE m.id IS NULL;
END;
$$ LANGUAGE plpgsql; 