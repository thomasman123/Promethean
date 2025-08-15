-- Comprehensive fix for all ambiguous column references in get_unmapped_sources
-- This ensures ALL column references have proper table prefixes

CREATE OR REPLACE FUNCTION get_unmapped_sources(p_account_id UUID)
RETURNS TABLE(
  ghl_source VARCHAR(100),
  usage_count BIGINT,
  sample_attribution JSONB,
  utm_campaigns TEXT[],
  session_sources TEXT[],
  high_value_leads_count BIGINT,
  latest_occurrence TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH unmapped_sources AS (
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
    WHERE m.id IS NULL
  ),
  source_stats AS (
    SELECT 
      us.ghl_source,
      COUNT(*) as total_count,
      -- Sample attribution data (latest occurrence) - fix account_id ambiguity
      (
        SELECT appointments.attribution_data 
        FROM appointments 
        WHERE appointments.account_id = p_account_id 
          AND appointments.ghl_source = us.ghl_source 
          AND appointments.attribution_data IS NOT NULL
        ORDER BY appointments.created_at DESC 
        LIMIT 1
      ) as sample_attribution_data,
      -- Aggregate UTM campaigns from the combined data
      array_agg(DISTINCT combined.utm_campaign) FILTER (WHERE combined.utm_campaign IS NOT NULL) as campaigns,
      -- Aggregate session sources from the combined data
      array_agg(DISTINCT combined.session_source) FILTER (WHERE combined.session_source IS NOT NULL) as sources,
      -- Count high value leads from the combined data
      COUNT(*) FILTER (WHERE combined.lead_value = '$100K+') as high_value_count,
      -- Latest occurrence from the combined data
      MAX(combined.created_at) as latest_at
    FROM unmapped_sources us
    LEFT JOIN (
      SELECT appointments.ghl_source, appointments.utm_campaign, appointments.session_source, 
             appointments.lead_value, appointments.created_at, appointments.attribution_data
      FROM appointments 
      WHERE appointments.account_id = p_account_id
      UNION ALL
      SELECT discoveries.ghl_source, discoveries.utm_campaign, discoveries.session_source, 
             discoveries.lead_value, discoveries.created_at, discoveries.attribution_data
      FROM discoveries 
      WHERE discoveries.account_id = p_account_id
    ) combined ON combined.ghl_source = us.ghl_source
    GROUP BY us.ghl_source
  )
  SELECT 
    ss.ghl_source::VARCHAR(100),
    ss.total_count::BIGINT,
    ss.sample_attribution_data,
    ss.campaigns,
    ss.sources,
    ss.high_value_count::BIGINT,
    ss.latest_at
  FROM source_stats ss
  ORDER BY ss.total_count DESC, ss.latest_at DESC;
END;
$$ LANGUAGE plpgsql; 