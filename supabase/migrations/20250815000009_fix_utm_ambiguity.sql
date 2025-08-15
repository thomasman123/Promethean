-- Fix ambiguous utm_source column references in get_unmapped_utm_combinations
-- The issue is in the JOIN condition where both tables have utm_source columns

CREATE OR REPLACE FUNCTION get_unmapped_utm_combinations(p_account_id UUID)
RETURNS TABLE(
  utm_source TEXT,
  utm_medium TEXT,
  usage_count BIGINT,
  sample_campaigns TEXT[],
  high_value_leads_count BIGINT,
  latest_occurrence TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH utm_combinations AS (
    SELECT 
      combined.utm_source,
      combined.utm_medium,
      COUNT(*) as total_count,
      array_agg(DISTINCT combined.utm_campaign) FILTER (WHERE combined.utm_campaign IS NOT NULL) as campaigns,
      COUNT(*) FILTER (WHERE combined.lead_value = '$100K+') as high_value_count,
      MAX(combined.created_at) as latest_at
    FROM (
      SELECT appointments.utm_source, appointments.utm_medium, appointments.utm_campaign, appointments.lead_value, appointments.created_at
      FROM appointments 
      WHERE appointments.account_id = p_account_id
      UNION ALL
      SELECT discoveries.utm_source, discoveries.utm_medium, discoveries.utm_campaign, discoveries.lead_value, discoveries.created_at
      FROM discoveries 
      WHERE discoveries.account_id = p_account_id
    ) combined
    WHERE combined.utm_source IS NOT NULL OR combined.utm_medium IS NOT NULL
    GROUP BY combined.utm_source, combined.utm_medium
  )
  SELECT 
    uc.utm_source,
    uc.utm_medium,
    uc.total_count::BIGINT,
    uc.campaigns,
    uc.high_value_count::BIGINT,
    uc.latest_at
  FROM utm_combinations uc
  LEFT JOIN utm_attribution_mappings uam 
    ON uam.account_id = p_account_id 
    AND (uam.utm_source = uc.utm_source OR (uam.utm_source IS NULL AND uc.utm_source IS NULL))
    AND (uam.utm_medium = uc.utm_medium OR (uam.utm_medium IS NULL AND uc.utm_medium IS NULL))
  WHERE uam.id IS NULL  -- Only unmapped combinations
  ORDER BY uc.total_count DESC, uc.latest_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Also fix the get_pending_attribution_mappings function
CREATE OR REPLACE FUNCTION get_pending_attribution_mappings(p_account_id UUID)
RETURNS TABLE(
  id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  source_category TEXT,
  specific_source TEXT,
  description TEXT,
  confidence_level TEXT,
  usage_count BIGINT,
  sample_campaigns TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uam.id,
    uam.utm_source,
    uam.utm_medium,
    uam.source_category,
    uam.specific_source,
    uam.description,
    uam.confidence_level,
    COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE appointments.account_id = p_account_id AND appointments.utm_source = uam.utm_source AND appointments.utm_medium = uam.utm_medium) +
      (SELECT COUNT(*) FROM discoveries WHERE discoveries.account_id = p_account_id AND discoveries.utm_source = uam.utm_source AND discoveries.utm_medium = uam.utm_medium),
      0
    )::BIGINT as usage_count,
    COALESCE(
      (SELECT array_agg(DISTINCT utm_campaign) FILTER (WHERE utm_campaign IS NOT NULL)
       FROM (
         SELECT appointments.utm_campaign FROM appointments WHERE appointments.account_id = p_account_id AND appointments.utm_source = uam.utm_source AND appointments.utm_medium = uam.utm_medium
         UNION ALL
         SELECT discoveries.utm_campaign FROM discoveries WHERE discoveries.account_id = p_account_id AND discoveries.utm_source = uam.utm_source AND discoveries.utm_medium = uam.utm_medium
       ) campaigns),
      ARRAY[]::TEXT[]
    ) as sample_campaigns,
    uam.created_at
  FROM utm_attribution_mappings uam
  WHERE uam.account_id = p_account_id
    AND uam.mapping_status = 'pending_approval'
    AND uam.auto_created = true
  ORDER BY uam.created_at DESC;
END;
$$ LANGUAGE plpgsql; 