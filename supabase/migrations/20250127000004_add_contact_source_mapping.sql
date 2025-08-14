-- Add contact source mappings table (separate from GHL appointment sources)
CREATE TABLE IF NOT EXISTS contact_source_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  contact_source text NOT NULL, -- e.g., "solis form", "public api"
  source_category text REFERENCES source_categories(name),
  specific_source text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(account_id, contact_source)
);

-- Add RLS policies for contact_source_mappings
ALTER TABLE contact_source_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact source mappings for their account" ON contact_source_mappings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = contact_source_mappings.account_id
      AND account_access.is_active = true
    )
  );

CREATE POLICY "Admins can manage contact source mappings" ON contact_source_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = contact_source_mappings.account_id
      AND account_access.is_active = true
      AND account_access.role IN ('admin', 'moderator')
    )
  );

-- Function to get unmapped contact sources
CREATE OR REPLACE FUNCTION get_unmapped_contact_sources(p_account_id uuid)
RETURNS TABLE(contact_source text, usage_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_contact_sources AS (
    SELECT 
      a.contact_source,
      COUNT(*) as usage_count
    FROM appointments a
    WHERE a.account_id = p_account_id 
      AND a.contact_source IS NOT NULL
      AND a.contact_source != ''
    GROUP BY a.contact_source
    
    UNION ALL
    
    SELECT 
      d.contact_source,
      COUNT(*) as usage_count
    FROM discoveries d  
    WHERE d.account_id = p_account_id
      AND d.contact_source IS NOT NULL
      AND d.contact_source != ''
    GROUP BY d.contact_source
  ),
  aggregated_sources AS (
    SELECT 
      contact_source,
      SUM(usage_count) as total_usage
    FROM all_contact_sources
    GROUP BY contact_source
  )
  SELECT 
    acs.contact_source,
    acs.total_usage
  FROM aggregated_sources acs
  LEFT JOIN contact_source_mappings csm 
    ON csm.account_id = p_account_id 
    AND csm.contact_source = acs.contact_source
  WHERE csm.id IS NULL  -- Only unmapped sources
  ORDER BY acs.total_usage DESC;
END;
$$;

-- Enhanced classify_contact_attribution function to use contact source mappings
CREATE OR REPLACE FUNCTION classify_contact_attribution_enhanced(
  p_contact_source text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_referrer text,
  p_gclid text,
  p_fbclid text,
  p_account_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb := '{}';
  contact_mapping record;
BEGIN
  -- Check for contact source mapping first
  SELECT 
    source_category,
    specific_source,
    description
  INTO contact_mapping
  FROM contact_source_mappings
  WHERE account_id = p_account_id 
    AND contact_source = p_contact_source
    AND is_active = true;

  -- If we have a contact source mapping, use it with high confidence
  IF FOUND THEN
    result := jsonb_build_object(
      'primary_source', p_contact_source,
      'source_category', contact_mapping.source_category,
      'specific_source', COALESCE(contact_mapping.specific_source, p_contact_source),
      'confidence', 'high',
      'mapping_type', 'contact_source'
    );
    RETURN result;
  END IF;

  -- Fall back to the original classification logic
  -- Google Ads detection
  IF p_gclid IS NOT NULL AND p_gclid != '' THEN
    result := jsonb_build_object(
      'primary_source', 'google_ads',
      'source_category', 'google_ads', 
      'specific_source', COALESCE(p_utm_campaign, 'Google Ads Campaign'),
      'confidence', 'high',
      'mapping_type', 'automatic'
    );
    RETURN result;
  END IF;

  -- Facebook Ads detection
  IF p_fbclid IS NOT NULL AND p_fbclid != '' THEN
    result := jsonb_build_object(
      'primary_source', 'facebook_ads',
      'source_category', 'facebook_ads',
      'specific_source', COALESCE(p_utm_campaign, 'Facebook Ads Campaign'),
      'confidence', 'high',
      'mapping_type', 'automatic'
    );
    RETURN result;
  END IF;

  -- UTM-based classification
  IF p_utm_source IS NOT NULL THEN
    CASE 
      WHEN LOWER(p_utm_source) LIKE '%google%' AND LOWER(p_utm_medium) = 'cpc' THEN
        result := jsonb_build_object(
          'primary_source', 'google_ads',
          'source_category', 'google_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'mapping_type', 'automatic'
        );
      WHEN LOWER(p_utm_source) LIKE '%facebook%' OR LOWER(p_utm_source) LIKE '%meta%' THEN
        result := jsonb_build_object(
          'primary_source', 'facebook_ads', 
          'source_category', 'facebook_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'mapping_type', 'automatic'
        );
      WHEN LOWER(p_utm_medium) = 'email' THEN
        result := jsonb_build_object(
          'primary_source', 'email_marketing',
          'source_category', 'email_marketing', 
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'mapping_type', 'automatic'
        );
      WHEN LOWER(p_utm_medium) IN ('social', 'social-media') THEN
        result := jsonb_build_object(
          'primary_source', 'social_media',
          'source_category', 'social_media',
          'specific_source', p_utm_source || CASE WHEN p_utm_campaign IS NOT NULL THEN ' - ' || p_utm_campaign ELSE '' END,
          'confidence', 'medium',
          'mapping_type', 'automatic'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', p_utm_source,
          'source_category', 'unknown',
          'specific_source', p_utm_campaign,
          'confidence', 'medium',
          'mapping_type', 'automatic'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Referrer-based classification
  IF p_referrer IS NOT NULL AND p_referrer != '' THEN
    CASE
      WHEN LOWER(p_referrer) LIKE '%google.%' THEN
        result := jsonb_build_object(
          'primary_source', 'organic_search',
          'source_category', 'organic_search',
          'specific_source', 'Google',
          'confidence', 'medium',
          'mapping_type', 'automatic'
        );
      WHEN LOWER(p_referrer) LIKE '%facebook.%' OR LOWER(p_referrer) LIKE '%fb.%' THEN
        result := jsonb_build_object(
          'primary_source', 'social_media',
          'source_category', 'social_media', 
          'specific_source', 'Facebook',
          'confidence', 'medium',
          'mapping_type', 'automatic'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', 'referral',
          'source_category', 'referral',
          'specific_source', p_referrer,
          'confidence', 'low',
          'mapping_type', 'automatic'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Contact source fallback (unmapped)
  IF p_contact_source IS NOT NULL AND p_contact_source != '' THEN
    result := jsonb_build_object(
      'primary_source', p_contact_source,
      'source_category', 'unknown',
      'specific_source', p_contact_source,
      'confidence', 'low',
      'mapping_type', 'unmapped'
    );
  ELSE
    result := jsonb_build_object(
      'primary_source', 'unknown',
      'source_category', 'unknown',
      'specific_source', null,
      'confidence', 'low',
      'mapping_type', 'unmapped'
    );
  END IF;

  RETURN result;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_source_mappings_account_source ON contact_source_mappings(account_id, contact_source);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_source_account ON appointments(account_id, contact_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_contact_source_account ON discoveries(account_id, contact_source); 