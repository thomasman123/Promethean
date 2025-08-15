-- Implement UTM-based attribution system and remove ineffective form-based mappings
-- This migration refactors the attribution system to use UTM parameters instead of form names

-- 1. Create UTM-based attribution mapping table
CREATE TABLE IF NOT EXISTS utm_attribution_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  utm_source VARCHAR(100), -- 'ig', 'fb', 'google', 'youtube', etc.
  utm_medium VARCHAR(100), -- 'ppc', 'organic', 'email', 'social', etc.
  source_category VARCHAR(50) NOT NULL REFERENCES source_categories(name),
  specific_source VARCHAR(200), -- More descriptive name like "Instagram Ads", "Google Organic"
  description TEXT,
  priority INTEGER DEFAULT 100, -- For handling conflicts (lower = higher priority)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id, utm_source, utm_medium)
);

-- 2. Add RLS policies for utm_attribution_mappings
ALTER TABLE utm_attribution_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view UTM attribution mappings for their account" ON utm_attribution_mappings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = utm_attribution_mappings.account_id
      AND account_access.is_active = true
    )
  );

CREATE POLICY "Admins can manage UTM attribution mappings" ON utm_attribution_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = utm_attribution_mappings.account_id
      AND account_access.is_active = true
      AND account_access.role IN ('admin', 'moderator')
    )
  );

-- 3. Insert default UTM mappings based on your setup
INSERT INTO utm_attribution_mappings (account_id, utm_source, utm_medium, source_category, specific_source, description, priority) 
SELECT DISTINCT 
  a.id as account_id,
  'ig',
  'ppc',
  'instagram_ads',
  'Instagram Ads',
  'Paid Instagram advertising campaigns',
  10
FROM accounts a
ON CONFLICT (account_id, utm_source, utm_medium) DO NOTHING;

INSERT INTO utm_attribution_mappings (account_id, utm_source, utm_medium, source_category, specific_source, description, priority)
SELECT DISTINCT 
  a.id as account_id,
  'fb', 
  'ppc',
  'facebook_ads',
  'Facebook Ads', 
  'Paid Facebook advertising campaigns',
  10
FROM accounts a
ON CONFLICT (account_id, utm_source, utm_medium) DO NOTHING;

INSERT INTO utm_attribution_mappings (account_id, utm_source, utm_medium, source_category, specific_source, description, priority)
SELECT DISTINCT 
  a.id as account_id,
  'google',
  'cpc',
  'google_ads',
  'Google Ads',
  'Paid Google advertising campaigns', 
  10
FROM accounts a
ON CONFLICT (account_id, utm_source, utm_medium) DO NOTHING;

-- Organic traffic mappings
INSERT INTO utm_attribution_mappings (account_id, utm_source, utm_medium, source_category, specific_source, description, priority)
SELECT DISTINCT 
  a.id as account_id,
  NULL, -- No UTM source
  NULL, -- No UTM medium  
  'organic',
  'Direct Traffic',
  'Direct website visits without UTM parameters',
  90
FROM accounts a
ON CONFLICT (account_id, utm_source, utm_medium) DO NOTHING;

-- 4. Create improved attribution classification function
CREATE OR REPLACE FUNCTION classify_utm_attribution(
  p_account_id UUID,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_fbclid TEXT DEFAULT NULL,
  p_gclid TEXT DEFAULT NULL,
  p_session_source TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB := '{}';
  utm_mapping RECORD;
BEGIN
  -- Priority 1: Check for UTM-based mappings (highest confidence)
  IF p_utm_source IS NOT NULL OR p_utm_medium IS NOT NULL THEN
    SELECT 
      source_category,
      specific_source,
      description,
      priority
    INTO utm_mapping
    FROM utm_attribution_mappings
    WHERE account_id = p_account_id 
      AND (utm_source = p_utm_source OR utm_source IS NULL)
      AND (utm_medium = p_utm_medium OR utm_medium IS NULL)
      AND is_active = true
    ORDER BY priority ASC, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      result := jsonb_build_object(
        'primary_source', COALESCE(p_utm_source, 'unknown'),
        'source_category', utm_mapping.source_category,
        'specific_source', utm_mapping.specific_source,
        'campaign', p_utm_campaign,
        'confidence', 'high',
        'mapping_type', 'utm_based',
        'utm_data', jsonb_build_object(
          'utm_source', p_utm_source,
          'utm_medium', p_utm_medium,
          'utm_campaign', p_utm_campaign,
          'utm_content', p_utm_content,
          'utm_term', p_utm_term
        )
      );
      RETURN result;
    END IF;
  END IF;

  -- Priority 2: Facebook Click ID detection (high confidence)
  IF p_fbclid IS NOT NULL AND p_fbclid != '' THEN
    result := jsonb_build_object(
      'primary_source', 'facebook',
      'source_category', 'facebook_ads',
      'specific_source', 'Facebook Ads (FBCLID)',
      'campaign', p_utm_campaign,
      'confidence', 'high',
      'mapping_type', 'fbclid_based',
      'fbclid', p_fbclid
    );
    RETURN result;
  END IF;

  -- Priority 3: Google Click ID detection (high confidence)  
  IF p_gclid IS NOT NULL AND p_gclid != '' THEN
    result := jsonb_build_object(
      'primary_source', 'google',
      'source_category', 'google_ads', 
      'specific_source', 'Google Ads (GCLID)',
      'campaign', p_utm_campaign,
      'confidence', 'high',
      'mapping_type', 'gclid_based',
      'gclid', p_gclid
    );
    RETURN result;
  END IF;

  -- Priority 4: Session source detection (medium confidence)
  IF p_session_source IS NOT NULL AND p_session_source != '' THEN
    CASE 
      WHEN LOWER(p_session_source) LIKE '%social%' THEN
        result := jsonb_build_object(
          'primary_source', 'social_organic',
          'source_category', 'social_organic',
          'specific_source', 'Organic Social Media',
          'confidence', 'medium',
          'mapping_type', 'session_based'
        );
      WHEN LOWER(p_session_source) LIKE '%google%' THEN
        result := jsonb_build_object(
          'primary_source', 'google_organic',
          'source_category', 'organic',
          'specific_source', 'Google Organic Search',
          'confidence', 'medium', 
          'mapping_type', 'session_based'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', p_session_source,
          'source_category', 'unknown',
          'specific_source', p_session_source,
          'confidence', 'low',
          'mapping_type', 'session_based'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Priority 5: Referrer-based detection (medium confidence)
  IF p_referrer IS NOT NULL AND p_referrer != '' THEN
    CASE
      WHEN LOWER(p_referrer) LIKE '%google.%' THEN
        result := jsonb_build_object(
          'primary_source', 'google_organic',
          'source_category', 'organic',
          'specific_source', 'Google Organic Search',
          'confidence', 'medium',
          'mapping_type', 'referrer_based'
        );
      WHEN LOWER(p_referrer) LIKE '%facebook.%' OR LOWER(p_referrer) LIKE '%fb.%' THEN
        result := jsonb_build_object(
          'primary_source', 'facebook_organic',
          'source_category', 'social_organic',
          'specific_source', 'Facebook Organic',
          'confidence', 'medium',
          'mapping_type', 'referrer_based'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', 'referral',
          'source_category', 'referral',
          'specific_source', p_referrer,
          'confidence', 'low',
          'mapping_type', 'referrer_based'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Fallback: Direct traffic (low confidence)
  result := jsonb_build_object(
    'primary_source', 'direct',
    'source_category', 'organic',
    'specific_source', 'Direct Traffic',
    'confidence', 'low',
    'mapping_type', 'fallback'
  );

  RETURN result;
END;
$$;

-- 5. Create function to get unmapped UTM combinations
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
      SELECT utm_source, utm_medium, utm_campaign, lead_value, created_at
      FROM appointments 
      WHERE account_id = p_account_id
      UNION ALL
      SELECT utm_source, utm_medium, utm_campaign, lead_value, created_at
      FROM discoveries 
      WHERE account_id = p_account_id
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
    AND uam.utm_source = uc.utm_source 
    AND uam.utm_medium = uc.utm_medium
  WHERE uam.id IS NULL  -- Only unmapped combinations
  ORDER BY uc.total_count DESC, uc.latest_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_utm_attribution_mappings_account_utm ON utm_attribution_mappings(account_id, utm_source, utm_medium);
CREATE INDEX IF NOT EXISTS idx_appointments_utm_source_medium ON appointments(account_id, utm_source, utm_medium);
CREATE INDEX IF NOT EXISTS idx_discoveries_utm_source_medium ON discoveries(account_id, utm_source, utm_medium);

-- 7. Add comments explaining the new system
COMMENT ON TABLE utm_attribution_mappings IS 'Maps UTM source/medium combinations to business categories for proper attribution';
COMMENT ON FUNCTION classify_utm_attribution IS 'Classifies leads based on UTM parameters with priority-based logic';
COMMENT ON FUNCTION get_unmapped_utm_combinations IS 'Returns UTM combinations that need manual mapping';

-- 8. Update existing appointments and discoveries with proper attribution
-- This will backfill attribution data for existing records
UPDATE appointments 
SET last_attribution_source = classify_utm_attribution(
  account_id,
  utm_source,
  utm_medium, 
  utm_campaign,
  utm_content,
  utm_term,
  fbclid,
  null, -- gclid
  session_source,
  null -- referrer
)
WHERE last_attribution_source IS NULL 
  AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR fbclid IS NOT NULL);

UPDATE discoveries
SET last_attribution_source = classify_utm_attribution(
  account_id,
  utm_source,
  utm_medium,
  utm_campaign, 
  utm_content,
  utm_term,
  fbclid,
  null, -- gclid
  session_source,
  null -- referrer  
)
WHERE last_attribution_source IS NULL
  AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR fbclid IS NOT NULL); 