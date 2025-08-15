-- Update source mapping page to use UTM-based attribution instead of form names
-- This replaces the old contact_source and ghl_source mapping with UTM-based mapping

-- 1. Create function to get all unmapped sources (both UTM and legacy)
CREATE OR REPLACE FUNCTION get_all_unmapped_sources(p_account_id UUID)
RETURNS TABLE(
  source_type TEXT, -- 'utm', 'contact', 'ghl'  
  source_identifier TEXT,
  source_display TEXT,
  usage_count BIGINT,
  sample_attribution JSONB,
  campaigns TEXT[],
  high_value_leads_count BIGINT,
  latest_occurrence TIMESTAMPTZ,
  is_recommended BOOLEAN -- True for UTM sources, false for legacy
) AS $$
BEGIN
  RETURN QUERY
  
  -- UTM-based sources (recommended)
  SELECT 
    'utm'::TEXT as source_type,
    CONCAT(COALESCE(uc.utm_source, 'null'), '|', COALESCE(uc.utm_medium, 'null')) as source_identifier,
    CASE 
      WHEN uc.utm_source IS NOT NULL AND uc.utm_medium IS NOT NULL THEN
        CONCAT(uc.utm_source, ' (', uc.utm_medium, ')')
      WHEN uc.utm_source IS NOT NULL THEN
        CONCAT(uc.utm_source, ' (no medium)')
      WHEN uc.utm_medium IS NOT NULL THEN
        CONCAT('(no source) ', uc.utm_medium)
      ELSE 'Unknown UTM'
    END as source_display,
    uc.usage_count,
    jsonb_build_object(
      'utm_source', uc.utm_source,
      'utm_medium', uc.utm_medium,
      'campaigns', uc.sample_campaigns
    ) as sample_attribution,
    uc.sample_campaigns as campaigns,
    uc.high_value_leads_count,
    uc.latest_occurrence,
    true as is_recommended
  FROM get_unmapped_utm_combinations(p_account_id) uc
  
  UNION ALL
  
  -- Legacy contact sources (not recommended, for cleanup)
  SELECT 
    'contact'::TEXT as source_type,
    cs.contact_source as source_identifier,
    CONCAT('📝 ', cs.contact_source, ' (legacy form)') as source_display,
    cs.usage_count,
    cs.sample_attribution,
    cs.utm_campaigns as campaigns,
    cs.high_value_leads_count,
    cs.latest_occurrence,
    false as is_recommended
  FROM get_unmapped_contact_sources(p_account_id) cs
  WHERE cs.usage_count > 0 -- Only show if there's actual usage
  
  UNION ALL
  
  -- Legacy GHL sources (not recommended, for cleanup)
  SELECT 
    'ghl'::TEXT as source_type,
    gs.ghl_source as source_identifier,
    CONCAT('⚙️ ', gs.ghl_source, ' (legacy GHL)') as source_display,
    gs.usage_count,
    gs.sample_attribution,
    gs.utm_campaigns as campaigns,
    gs.high_value_leads_count,
    gs.latest_occurrence,
    false as is_recommended
  FROM get_unmapped_sources(p_account_id) gs
  WHERE gs.usage_count > 0 -- Only show if there's actual usage
  
  ORDER BY is_recommended DESC, usage_count DESC, latest_occurrence DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to save UTM mapping
CREATE OR REPLACE FUNCTION save_utm_mapping(
  p_account_id UUID,
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_source_category TEXT,
  p_specific_source TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO utm_attribution_mappings (
    account_id,
    utm_source,
    utm_medium,
    source_category,
    specific_source,
    description,
    updated_at
  ) VALUES (
    p_account_id,
    NULLIF(p_utm_source, 'null'),
    NULLIF(p_utm_medium, 'null'),
    p_source_category,
    p_specific_source,
    p_description,
    NOW()
  )
  ON CONFLICT (account_id, utm_source, utm_medium) 
  DO UPDATE SET
    source_category = p_source_category,
    specific_source = p_specific_source,
    description = p_description,
    updated_at = NOW()
  RETURNING jsonb_build_object(
    'id', id,
    'utm_source', utm_source,
    'utm_medium', utm_medium,
    'source_category', source_category,
    'specific_source', specific_source
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 3. Create function to get recommended mapping suggestions
CREATE OR REPLACE FUNCTION get_utm_mapping_suggestions(
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_campaigns TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  suggestion JSONB;
BEGIN
  -- Instagram paid ads
  IF LOWER(p_utm_source) = 'ig' AND LOWER(p_utm_medium) = 'ppc' THEN
    suggestion := jsonb_build_object(
      'source_category', 'instagram_ads',
      'specific_source', 'Instagram Ads',
      'description', 'Paid Instagram advertising campaigns',
      'confidence', 'high',
      'reason', 'Standard Instagram paid traffic pattern'
    );
  -- Facebook paid ads
  ELSIF LOWER(p_utm_source) = 'fb' AND LOWER(p_utm_medium) = 'ppc' THEN
    suggestion := jsonb_build_object(
      'source_category', 'facebook_ads',
      'specific_source', 'Facebook Ads',
      'description', 'Paid Facebook advertising campaigns',
      'confidence', 'high',
      'reason', 'Standard Facebook paid traffic pattern'
    );
  -- Google paid ads
  ELSIF LOWER(p_utm_source) = 'google' AND LOWER(p_utm_medium) IN ('cpc', 'ppc') THEN
    suggestion := jsonb_build_object(
      'source_category', 'google_ads',
      'specific_source', 'Google Ads',
      'description', 'Paid Google advertising campaigns',
      'confidence', 'high',
      'reason', 'Standard Google paid traffic pattern'
    );
  -- Email marketing
  ELSIF LOWER(p_utm_medium) = 'email' THEN
    suggestion := jsonb_build_object(
      'source_category', 'email_marketing',
      'specific_source', 'Email Campaign',
      'description', 'Email marketing campaigns',
      'confidence', 'high',
      'reason', 'Email medium detected'
    );
  -- Social organic
  ELSIF LOWER(p_utm_medium) IN ('social', 'organic') THEN
    suggestion := jsonb_build_object(
      'source_category', 'social_organic',
      'specific_source', 'Organic Social Media',
      'description', 'Organic social media traffic',
      'confidence', 'medium',
      'reason', 'Social/organic medium detected'
    );
  -- Default suggestion for unknown patterns
  ELSE
    suggestion := jsonb_build_object(
      'source_category', 'unknown',
      'specific_source', CONCAT(COALESCE(p_utm_source, 'Unknown'), ' - ', COALESCE(p_utm_medium, 'Unknown')),
      'description', 'Custom traffic source requiring manual categorization',
      'confidence', 'low',
      'reason', 'No automatic pattern match found'
    );
  END IF;
  
  RETURN suggestion;
END;
$$; 