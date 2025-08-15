-- Enhance unmapped sources functions to include attribution data and sample data
-- This migration updates existing functions to provide richer attribution information

-- 1. Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS get_unmapped_sources(UUID);
DROP FUNCTION IF EXISTS get_unmapped_contact_sources(uuid);

-- 2. Enhanced get_unmapped_sources function with attribution data
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
          AND ghl_source = us.ghl_source 
          AND attribution_data IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT 1
      ) as sample_attribution_data,
      -- Aggregate UTM campaigns
      array_agg(DISTINCT utm_campaign) FILTER (WHERE utm_campaign IS NOT NULL) as campaigns,
      -- Aggregate session sources  
      array_agg(DISTINCT session_source) FILTER (WHERE session_source IS NOT NULL) as sources,
      -- Count high value leads
      COUNT(*) FILTER (WHERE lead_value = '$100K+') as high_value_count,
      -- Latest occurrence
      MAX(created_at) as latest_at
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

-- 3. Enhanced get_unmapped_contact_sources function with attribution data
CREATE OR REPLACE FUNCTION get_unmapped_contact_sources(p_account_id uuid)
RETURNS TABLE(
  contact_source text, 
  usage_count bigint,
  sample_attribution JSONB,
  utm_campaigns TEXT[],
  landing_urls TEXT[],
  high_value_leads_count BIGINT,
  latest_occurrence TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_contact_sources AS (
    SELECT 
      a.contact_source as contact_source,
      COUNT(*) as usage_count,
      a.utm_campaign,
      a.landing_url,
      a.lead_value,
      a.attribution_data,
      a.created_at
    FROM appointments a
    WHERE a.account_id = p_account_id 
      AND a.contact_source IS NOT NULL
      AND a.contact_source != ''
    GROUP BY a.contact_source, a.utm_campaign, a.landing_url, a.lead_value, a.attribution_data, a.created_at
    
    UNION ALL
    
    SELECT 
      d.contact_source as contact_source,
      COUNT(*) as usage_count,
      d.utm_campaign,
      d.landing_url,
      d.lead_value,
      d.attribution_data,
      d.created_at
    FROM discoveries d  
    WHERE d.account_id = p_account_id
      AND d.contact_source IS NOT NULL
      AND d.contact_source != ''
    GROUP BY d.contact_source, d.utm_campaign, d.landing_url, d.lead_value, d.attribution_data, d.created_at
  ),
  aggregated_sources AS (
    SELECT 
      acs.contact_source,
      SUM(acs.usage_count)::bigint as total_usage,
      -- Sample attribution (latest)
      (array_agg(acs.attribution_data ORDER BY acs.created_at DESC))[1] as sample_attribution_data,
      -- Aggregate campaigns and URLs
      array_agg(DISTINCT acs.utm_campaign) FILTER (WHERE acs.utm_campaign IS NOT NULL) as campaigns,
      array_agg(DISTINCT acs.landing_url) FILTER (WHERE acs.landing_url IS NOT NULL) as urls,
      -- High value leads
      SUM(CASE WHEN acs.lead_value = '$100K+' THEN acs.usage_count ELSE 0 END)::bigint as high_value_count,
      -- Latest occurrence
      MAX(acs.created_at) as latest_at
    FROM all_contact_sources acs
    GROUP BY acs.contact_source
  )
  SELECT 
    aggs.contact_source,
    aggs.total_usage,
    aggs.sample_attribution_data,
    aggs.campaigns,
    aggs.urls,
    aggs.high_value_count,
    aggs.latest_at
  FROM aggregated_sources aggs
  LEFT JOIN contact_source_mappings csm 
    ON csm.account_id = p_account_id 
    AND csm.contact_source = aggs.contact_source
  WHERE csm.id IS NULL  -- Only unmapped sources
  ORDER BY aggs.total_usage DESC, aggs.latest_at DESC;
END;
$$;

-- 4. Function to get attribution insights for a specific source
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
    -- Sample attribution
    (
      SELECT attribution_data 
      FROM (
        SELECT attribution_data FROM appointments WHERE account_id = p_account_id AND ghl_source = p_source
        UNION ALL
        SELECT attribution_data FROM discoveries WHERE account_id = p_account_id AND ghl_source = p_source
      ) sample_data
      WHERE attribution_data IS NOT NULL
      ORDER BY random()
      LIMIT 1
    );
END;
$$;

-- 5. Add sample enhanced attribution data for testing
-- This will populate some example data based on the Mario Soberanes contact structure

DO $$
DECLARE
  test_account_id uuid;
  sample_attribution jsonb;
BEGIN
  -- Get the first account for testing (adjust as needed)
  SELECT id INTO test_account_id FROM accounts LIMIT 1;
  
  IF test_account_id IS NOT NULL THEN
    -- Sample Instagram campaign attribution
    sample_attribution := jsonb_build_object(
      'sessionSource', 'Social media',
      'url', 'https://go.heliosscale.com/recruit-booking?utm_source=ig&utm_medium=ppc&utm_campaign=Ascension+|+Book+A+Call',
      'campaign', 'Ascension | Book A Call', 
      'utmSource', 'ig',
      'utmMedium', 'ppc',
      'utmContent', '120228325647450509',
      'utmTerm', '120228100307790509',
      'fbclid', 'PAZXh0bgNhZW0BMABhZGlkAasjJA4t_50Bpyda56pQX_cq4TkY87eovECBde6Z-eBuLW58HTSSOn7HDunj-aFIuaPyWhLk_aem_wVepYj30YRg34hBpxm4IdQ',
      'fbc', 'fb.1.1753561787953.PAZ...',
      'fbp', 'fb.1.1753561787954.755848283641069712',
      'userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15',
      'ip', '2600:387:c:7212::a',
      'medium', 'calendar',
      'mediumId', 's2yFGrQAQ56y4xd89uAB',
      'utm_id', '120228100303730509'
    );

    -- Insert a sample appointment with enhanced attribution
    INSERT INTO appointments (
      account_id, setter, contact_name, email, phone,
      date_booked_for, ghl_source, contact_source,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id,
      fbclid, fbc, fbp, landing_url, session_source, medium_id,
      attribution_data, lead_value, lead_path, business_type
    ) VALUES (
      test_account_id, 'System', 'Sample Attribution Test', 'test@example.com', '+1234567890',
      NOW() + INTERVAL '1 day', 'calendar', 'Demo Meeting with Attribution Test',
      'ig', 'ppc', 'Ascension | Book A Call', '120228325647450509', '120228100307790509', '120228100303730509',
      'PAZXh0bgNhZW0BMABhZGlkAasjJA4t_50Bpyda56pQX_cq4TkY87eovECBde6Z-eBuLW58HTSSOn7HDunj-aFIuaPyWhLk_aem_wVepYj30YRg34hBpxm4IdQ',
      'fb.1.1753561787953.PAZ...', 'fb.1.1753561787954.755848283641069712',
      'https://go.heliosscale.com/recruit-booking?utm_source=ig&utm_medium=ppc&utm_campaign=Ascension+|+Book+A+Call',
      'Social media', 's2yFGrQAQ56y4xd89uAB',
      sample_attribution, '$100K+', 'Paid Ads -> Sales Calls', 'Agency'
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Sample enhanced attribution data inserted for account %', test_account_id;
  END IF;
END;
$$; 