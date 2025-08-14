-- Add contact attribution fields to appointments and discoveries tables
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_source text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_utm_source text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_utm_medium text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_utm_campaign text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_utm_content text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_referrer text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_gclid text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_fbclid text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_campaign_id text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_attribution_source jsonb;

ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_source text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_utm_source text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_utm_medium text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_utm_campaign text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_utm_content text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_referrer text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_gclid text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_fbclid text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_campaign_id text;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS last_attribution_source jsonb;

-- Create enhanced source categories for contact attribution
INSERT INTO source_categories (name, display_name, description) VALUES 
  ('google_ads', 'Google Ads', 'Traffic from Google Ads campaigns')
ON CONFLICT (name) DO NOTHING;

INSERT INTO source_categories (name, display_name, description) VALUES 
  ('facebook_ads', 'Facebook Ads', 'Traffic from Facebook/Meta advertising')
ON CONFLICT (name) DO NOTHING;

INSERT INTO source_categories (name, display_name, description) VALUES 
  ('organic_search', 'Organic Search', 'Organic traffic from search engines')
ON CONFLICT (name) DO NOTHING;

INSERT INTO source_categories (name, display_name, description) VALUES 
  ('direct_traffic', 'Direct Traffic', 'Direct website visits')
ON CONFLICT (name) DO NOTHING;

INSERT INTO source_categories (name, display_name, description) VALUES 
  ('email_marketing', 'Email Marketing', 'Traffic from email campaigns')
ON CONFLICT (name) DO NOTHING;

INSERT INTO source_categories (name, display_name, description) VALUES 
  ('social_media', 'Social Media', 'Traffic from social media platforms')
ON CONFLICT (name) DO NOTHING;

-- Create attribution mapping table for automatic contact source classification
CREATE TABLE IF NOT EXISTS contact_attribution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('utm_source', 'utm_medium', 'referrer', 'gclid', 'fbclid', 'campaign_pattern')),
  pattern text NOT NULL,
  source_category text REFERENCES source_categories(name),
  specific_source text,
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(account_id, rule_name)
);

-- Add RLS policies for contact_attribution_rules
ALTER TABLE contact_attribution_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact attribution rules for their account" ON contact_attribution_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = contact_attribution_rules.account_id
      AND account_access.is_active = true
    )
  );

CREATE POLICY "Admins can manage contact attribution rules" ON contact_attribution_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = contact_attribution_rules.account_id
      AND account_access.is_active = true
      AND account_access.role IN ('admin', 'moderator')
    )
  );

-- Create function to classify contact attribution
CREATE OR REPLACE FUNCTION classify_contact_attribution(
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
  rule_result record;
BEGIN
  -- Default classification
  result := jsonb_build_object(
    'primary_source', 'unknown',
    'source_category', 'unknown',
    'specific_source', null,
    'confidence', 'low'
  );

  -- Google Ads detection
  IF p_gclid IS NOT NULL AND p_gclid != '' THEN
    result := jsonb_build_object(
      'primary_source', 'google_ads',
      'source_category', 'google_ads', 
      'specific_source', COALESCE(p_utm_campaign, 'Google Ads Campaign'),
      'confidence', 'high'
    );
    RETURN result;
  END IF;

  -- Facebook Ads detection
  IF p_fbclid IS NOT NULL AND p_fbclid != '' THEN
    result := jsonb_build_object(
      'primary_source', 'facebook_ads',
      'source_category', 'facebook_ads',
      'specific_source', COALESCE(p_utm_campaign, 'Facebook Ads Campaign'),
      'confidence', 'high'
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
          'confidence', 'high'
        );
      WHEN LOWER(p_utm_source) LIKE '%facebook%' OR LOWER(p_utm_source) LIKE '%meta%' THEN
        result := jsonb_build_object(
          'primary_source', 'facebook_ads', 
          'source_category', 'facebook_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high'
        );
      WHEN LOWER(p_utm_medium) = 'email' THEN
        result := jsonb_build_object(
          'primary_source', 'email_marketing',
          'source_category', 'email_marketing', 
          'specific_source', p_utm_campaign,
          'confidence', 'high'
        );
      WHEN LOWER(p_utm_medium) IN ('social', 'social-media') THEN
        result := jsonb_build_object(
          'primary_source', 'social_media',
          'source_category', 'social_media',
          'specific_source', p_utm_source || CASE WHEN p_utm_campaign IS NOT NULL THEN ' - ' || p_utm_campaign ELSE '' END,
          'confidence', 'medium'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', p_utm_source,
          'source_category', 'unknown',
          'specific_source', p_utm_campaign,
          'confidence', 'medium'
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
          'confidence', 'medium'
        );
      WHEN LOWER(p_referrer) LIKE '%facebook.%' OR LOWER(p_referrer) LIKE '%fb.%' THEN
        result := jsonb_build_object(
          'primary_source', 'social_media',
          'source_category', 'social_media', 
          'specific_source', 'Facebook',
          'confidence', 'medium'
        );
      WHEN LOWER(p_referrer) LIKE '%linkedin.%' THEN
        result := jsonb_build_object(
          'primary_source', 'social_media',
          'source_category', 'social_media',
          'specific_source', 'LinkedIn', 
          'confidence', 'medium'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', 'referral',
          'source_category', 'referral',
          'specific_source', p_referrer,
          'confidence', 'low'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Contact source fallback
  IF p_contact_source IS NOT NULL AND p_contact_source != '' THEN
    result := jsonb_build_object(
      'primary_source', p_contact_source,
      'source_category', 'unknown',
      'specific_source', p_contact_source,
      'confidence', 'low'
    );
  END IF;

  RETURN result;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_contact_source ON appointments(contact_source);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_utm_source ON appointments(contact_utm_source);
CREATE INDEX IF NOT EXISTS idx_appointments_ghl_source ON appointments(ghl_source);

CREATE INDEX IF NOT EXISTS idx_discoveries_contact_source ON discoveries(contact_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_contact_utm_source ON discoveries(contact_utm_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_ghl_source ON discoveries(ghl_source);

-- Update the source attribution summary view to include contact attribution
DROP VIEW IF EXISTS source_attribution_summary;
CREATE VIEW source_attribution_summary AS
WITH attribution_data AS (
  SELECT 
    account_id,
    'appointment' as record_type,
    ghl_source,
    source_category as ghl_source_category,
    specific_source as ghl_specific_source,
    contact_source,
    contact_utm_source,
    contact_utm_medium,
    contact_utm_campaign,
    (last_attribution_source->>'primary_source') as contact_primary_source,
    (last_attribution_source->>'source_category') as contact_source_category,
    (last_attribution_source->>'specific_source') as contact_specific_source,
    (last_attribution_source->>'confidence') as attribution_confidence,
    created_at
  FROM appointments
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  
  UNION ALL
  
  SELECT 
    account_id,
    'discovery' as record_type,
    ghl_source,
    source_category as ghl_source_category,
    specific_source as ghl_specific_source,
    contact_source,
    contact_utm_source,
    contact_utm_medium,
    contact_utm_campaign,
    (last_attribution_source->>'primary_source') as contact_primary_source,
    (last_attribution_source->>'source_category') as contact_source_category,
    (last_attribution_source->>'specific_source') as contact_specific_source,
    (last_attribution_source->>'confidence') as attribution_confidence,
    created_at
  FROM discoveries
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
  account_id,
  record_type,
  
  -- GHL source stats
  ghl_source,
  ghl_source_category,
  COUNT(*) FILTER (WHERE ghl_source IS NOT NULL) as ghl_source_count,
  
  -- Contact attribution stats  
  contact_primary_source,
  contact_source_category,
  contact_specific_source,
  COUNT(*) FILTER (WHERE contact_primary_source IS NOT NULL) as contact_attribution_count,
  
  -- Combined stats
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE attribution_confidence = 'high') as high_confidence_count,
  COUNT(*) FILTER (WHERE attribution_confidence = 'medium') as medium_confidence_count,
  COUNT(*) FILTER (WHERE attribution_confidence = 'low') as low_confidence_count,
  
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM attribution_data
GROUP BY 
  account_id, 
  record_type, 
  ghl_source, 
  ghl_source_category,
  contact_primary_source,
  contact_source_category, 
  contact_specific_source
ORDER BY total_records DESC; 