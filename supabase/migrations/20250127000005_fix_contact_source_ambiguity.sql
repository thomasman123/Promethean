-- Fix ambiguous column reference in get_unmapped_contact_sources function
CREATE OR REPLACE FUNCTION get_unmapped_contact_sources(p_account_id uuid)
RETURNS TABLE(contact_source text, usage_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_contact_sources AS (
    SELECT 
      a.contact_source as contact_source,
      COUNT(*) as usage_count
    FROM appointments a
    WHERE a.account_id = p_account_id 
      AND a.contact_source IS NOT NULL
      AND a.contact_source != ''
    GROUP BY a.contact_source
    
    UNION ALL
    
    SELECT 
      d.contact_source as contact_source,
      COUNT(*) as usage_count
    FROM discoveries d  
    WHERE d.account_id = p_account_id
      AND d.contact_source IS NOT NULL
      AND d.contact_source != ''
    GROUP BY d.contact_source
  ),
  aggregated_sources AS (
    SELECT 
      acs.contact_source,
      SUM(acs.usage_count) as total_usage
    FROM all_contact_sources acs
    GROUP BY acs.contact_source
  )
  SELECT 
    aggs.contact_source,
    aggs.total_usage
  FROM aggregated_sources aggs
  LEFT JOIN contact_source_mappings csm 
    ON csm.account_id = p_account_id 
    AND csm.contact_source = aggs.contact_source
  WHERE csm.id IS NULL  -- Only unmapped sources
  ORDER BY aggs.total_usage DESC;
END;
$$; 