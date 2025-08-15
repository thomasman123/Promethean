-- Fix remaining ambiguous column references in get_source_attribution_insights function
-- Lines 178 and 180 still have ambiguous ghl_source and contact_source references

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
    -- Sample attribution (fix the ambiguous reference by using table prefixes)
    (
      CASE p_source_type 
        WHEN 'contact' THEN (
          SELECT attribution_data 
          FROM (
            SELECT attribution_data FROM appointments WHERE account_id = p_account_id AND appointments.contact_source = p_source
            UNION ALL
            SELECT attribution_data FROM discoveries WHERE account_id = p_account_id AND discoveries.contact_source = p_source
          ) sample_data
          WHERE attribution_data IS NOT NULL
          ORDER BY random()
          LIMIT 1
        )
        ELSE (
          SELECT attribution_data 
          FROM (
            SELECT attribution_data FROM appointments WHERE account_id = p_account_id AND appointments.ghl_source = p_source
            UNION ALL
            SELECT attribution_data FROM discoveries WHERE account_id = p_account_id AND discoveries.ghl_source = p_source
          ) sample_data
          WHERE attribution_data IS NOT NULL
          ORDER BY random()
          LIMIT 1
        )
      END
    );
END;
$$; 