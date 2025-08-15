-- Fix ambiguous column reference in get_unmapped_sources function
-- The issue is in lines 43 and 252-253 where ghl_source is referenced without table prefix

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
      -- Sample attribution data (latest occurrence)
      (
        SELECT attribution_data 
        FROM appointments 
        WHERE account_id = p_account_id 
          AND appointments.ghl_source = us.ghl_source 
          AND attribution_data IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT 1
      ) as sample_attribution_data,
      -- Aggregate UTM campaigns
      array_agg(DISTINCT combined.utm_campaign) FILTER (WHERE combined.utm_campaign IS NOT NULL) as campaigns,
      -- Aggregate session sources  
      array_agg(DISTINCT combined.session_source) FILTER (WHERE combined.session_source IS NOT NULL) as sources,
      -- Count high value leads
      COUNT(*) FILTER (WHERE combined.lead_value = '$100K+') as high_value_count,
      -- Latest occurrence
      MAX(combined.created_at) as latest_at
    FROM unmapped_sources us
    LEFT JOIN (
      SELECT ghl_source, utm_campaign, session_source, lead_value, created_at, attribution_data
      FROM appointments 
      WHERE account_id = p_account_id
      UNION ALL
      SELECT ghl_source, utm_campaign, session_source, lead_value, created_at, attribution_data
      FROM discoveries 
      WHERE account_id = p_account_id
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

-- Also fix the get_source_attribution_insights function where ghl_source is ambiguous
CREATE OR REPLACE FUNCTION get_source_attribution_insights(
  p_account_id uuid,
  p_source text,
  p_source_type text DEFAULT 'ghl' -- 'ghl' or 'contact'
)
RETURNS TABLE(
  source_name text,
  total_leads bigint,
  high_value_leads bigint,
  conversion_rate numeric,
  attribution_confidence text,
  top_campaigns JSONB,
  funnel_journey JSONB,
  sample_attribution JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  source_field text;
  total_count bigint;
  high_value_count bigint;
  confidence_distribution JSONB;
BEGIN
  -- Determine which field to query based on source type
  source_field := CASE p_source_type 
    WHEN 'contact' THEN 'contact_source'
    ELSE 'ghl_source'
  END;

  -- Get basic stats
  EXECUTE format('
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE lead_value = ''$100K+'') as high_value
    FROM (
      SELECT lead_value FROM appointments WHERE account_id = $1 AND %I = $2
      UNION ALL  
      SELECT lead_value FROM discoveries WHERE account_id = $1 AND %I = $2
    ) combined', source_field, source_field)
  INTO total_count, high_value_count
  USING p_account_id, p_source;

  -- Build confidence distribution
  EXECUTE format('
    SELECT jsonb_object_agg(
      confidence_level, 
      lead_count
    )
    FROM (
      SELECT 
        COALESCE((attribution_data->>''confidence'')::text, ''unknown'') as confidence_level,
        COUNT(*) as lead_count
      FROM (
        SELECT attribution_data FROM appointments WHERE account_id = $1 AND %I = $2
        UNION ALL
        SELECT attribution_data FROM discoveries WHERE account_id = $1 AND %I = $2  
      ) combined
      WHERE attribution_data IS NOT NULL
      GROUP BY confidence_level
    ) conf_stats', source_field, source_field)
  INTO confidence_distribution
  USING p_account_id, p_source;

  RETURN QUERY
  SELECT 
    p_source::text,
    total_count,
    high_value_count,
    CASE 
      WHEN total_count > 0 THEN ROUND((high_value_count::numeric / total_count::numeric) * 100, 1)
      ELSE 0
    END,
    CASE 
      WHEN confidence_distribution ? 'high' THEN 'high'
      WHEN confidence_distribution ? 'medium' THEN 'medium'  
      WHEN confidence_distribution ? 'low' THEN 'low'
      ELSE 'unknown'
    END::text,
    confidence_distribution,
    -- Sample funnel journey (simplified)
    jsonb_build_array(
      jsonb_build_object('step', 'Source', 'value', p_source),
      jsonb_build_object('step', 'Landing', 'value', 'Funnel Page'),
      jsonb_build_object('step', 'Conversion', 'value', 'Appointment')
    ),
    -- Sample attribution (fix the ambiguous reference by using the dynamic field)
    (
      CASE p_source_type 
        WHEN 'contact' THEN (
          SELECT attribution_data 
          FROM (
            SELECT attribution_data FROM appointments WHERE account_id = p_account_id AND contact_source = p_source
            UNION ALL
            SELECT attribution_data FROM discoveries WHERE account_id = p_account_id AND contact_source = p_source
          ) sample_data
          WHERE attribution_data IS NOT NULL
          ORDER BY random()
          LIMIT 1
        )
        ELSE (
          SELECT attribution_data 
          FROM (
            SELECT attribution_data FROM appointments WHERE account_id = p_account_id AND ghl_source = p_source
            UNION ALL
            SELECT attribution_data FROM discoveries WHERE account_id = p_account_id AND ghl_source = p_source
          ) sample_data
          WHERE attribution_data IS NOT NULL
          ORDER BY random()
          LIMIT 1
        )
      END
    );
END;
$$; 