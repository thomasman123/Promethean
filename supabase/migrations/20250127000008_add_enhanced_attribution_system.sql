-- Add enhanced attribution system for complete multi-step tracking
-- This migration adds comprehensive attribution fields while maintaining existing functionality

-- 1. Add enhanced attribution fields to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_id TEXT; -- Campaign ID from Meta/Google
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS fbc TEXT; -- Facebook Browser Cookie
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS fbp TEXT; -- Facebook Pixel
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS landing_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS session_source TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS medium_id TEXT; -- GHL medium ID
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS attribution_data JSONB; -- Full attribution object
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_attribution_data JSONB; -- Last attribution object
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_value TEXT; -- Custom field: revenue potential
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_path TEXT; -- Custom field: lead journey
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS business_type TEXT; -- Custom field: business category

-- 2. Add same enhanced attribution fields to discoveries table
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS utm_id TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS landing_url TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS session_source TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS medium_id TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS attribution_data JSONB;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS last_attribution_data JSONB;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS lead_value TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS lead_path TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS business_type TEXT;

-- 3. Create indexes for performance on new attribution fields
CREATE INDEX IF NOT EXISTS idx_appointments_utm_source ON appointments(utm_source);
CREATE INDEX IF NOT EXISTS idx_appointments_utm_campaign ON appointments(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_appointments_fbclid ON appointments(fbclid);
CREATE INDEX IF NOT EXISTS idx_appointments_session_source ON appointments(session_source);
CREATE INDEX IF NOT EXISTS idx_appointments_utm_id ON appointments(utm_id);
CREATE INDEX IF NOT EXISTS idx_appointments_attribution_data ON appointments USING GIN(attribution_data);

CREATE INDEX IF NOT EXISTS idx_discoveries_utm_source ON discoveries(utm_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_utm_campaign ON discoveries(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_discoveries_fbclid ON discoveries(fbclid);
CREATE INDEX IF NOT EXISTS idx_discoveries_session_source ON discoveries(session_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_utm_id ON discoveries(utm_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_attribution_data ON discoveries USING GIN(attribution_data);

-- 4. Enhanced source categories for better attribution classification
INSERT INTO source_categories (name, display_name, description) VALUES
('instagram_ads', 'Instagram Ads', 'Appointments from Instagram advertising campaigns'),
('facebook_ads', 'Facebook Ads', 'Appointments from Facebook advertising campaigns'),
('google_ads', 'Google Ads', 'Appointments from Google advertising campaigns'),
('linkedin_ads', 'LinkedIn Ads', 'Appointments from LinkedIn advertising campaigns'),
('tiktok_ads', 'TikTok Ads', 'Appointments from TikTok advertising campaigns'),
('youtube_ads', 'YouTube Ads', 'Appointments from YouTube advertising campaigns'),
('social_organic', 'Social Media Organic', 'Organic social media appointments'),
('email_marketing', 'Email Marketing', 'Appointments from email campaigns'),
('content_marketing', 'Content Marketing', 'Appointments from blog/content'),
('webinar', 'Webinar', 'Appointments from webinar attendees'),
('podcast', 'Podcast', 'Appointments from podcast mentions'),
('affiliate', 'Affiliate/Partner', 'Appointments from affiliate partners'),
('retargeting', 'Retargeting', 'Appointments from retargeting campaigns')
ON CONFLICT (name) DO NOTHING;

-- 5. Function to extract attribution data from GHL contact response
CREATE OR REPLACE FUNCTION extract_attribution_from_contact(contact_data JSONB)
RETURNS TABLE(
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  utm_id TEXT,
  fbclid TEXT,
  fbc TEXT,
  fbp TEXT,
  landing_url TEXT,
  session_source TEXT,
  medium_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  attribution_data JSONB,
  last_attribution_data JSONB,
  lead_value TEXT,
  lead_path TEXT,
  business_type TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  attribution_source JSONB;
  last_attribution_source JSONB;
  custom_fields JSONB;
BEGIN
  -- Extract attributionSource
  attribution_source := contact_data->'attributionSource';
  last_attribution_source := contact_data->'lastAttributionSource';
  custom_fields := contact_data->'customField';
  
  RETURN QUERY SELECT
    (attribution_source->>'utmSource')::TEXT,
    (attribution_source->>'utmMedium')::TEXT,
    (attribution_source->>'campaign')::TEXT,
    (attribution_source->>'utmContent')::TEXT,
    (attribution_source->>'utmTerm')::TEXT,
    (attribution_source->>'utm_id')::TEXT,
    (attribution_source->>'fbclid')::TEXT,
    (attribution_source->>'fbc')::TEXT,
    (attribution_source->>'fbp')::TEXT,
    (attribution_source->>'url')::TEXT,
    (attribution_source->>'sessionSource')::TEXT,
    (attribution_source->>'mediumId')::TEXT,
    (attribution_source->>'userAgent')::TEXT,
    (attribution_source->>'ip')::TEXT,
    attribution_source,
    last_attribution_source,
    -- Extract custom fields by ID (adjust IDs based on your setup)
    (SELECT value FROM jsonb_array_elements(custom_fields) cf WHERE cf->>'id' = '13n0JVzjarD1UTyiDfNN'),
    (SELECT value FROM jsonb_array_elements(custom_fields) cf WHERE cf->>'id' = 'vHICYHikZaD4Qjkt7F8K'),
    (SELECT value FROM jsonb_array_elements(custom_fields) cf WHERE cf->>'id' = 'Y1Kj2lNM1o8Hcs7fI7tq');
END;
$$;

-- 6. Enhanced attribution classification function
CREATE OR REPLACE FUNCTION classify_enhanced_attribution(
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_utm_campaign TEXT,
  p_session_source TEXT,
  p_fbclid TEXT,
  p_landing_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Facebook/Instagram Ads (highest priority)
  IF p_fbclid IS NOT NULL AND p_fbclid != '' THEN
    CASE 
      WHEN LOWER(p_utm_source) = 'ig' OR LOWER(p_utm_source) LIKE '%instagram%' THEN
        result := jsonb_build_object(
          'primary_source', 'instagram_ads',
          'source_category', 'instagram_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'attribution_type', 'paid_social'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', 'facebook_ads',
          'source_category', 'facebook_ads', 
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'attribution_type', 'paid_social'
        );
    END CASE;
    RETURN result;
  END IF;

  -- UTM-based classification
  IF p_utm_source IS NOT NULL AND p_utm_medium IS NOT NULL THEN
    CASE 
      WHEN LOWER(p_utm_source) = 'ig' AND LOWER(p_utm_medium) = 'ppc' THEN
        result := jsonb_build_object(
          'primary_source', 'instagram_ads',
          'source_category', 'instagram_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'attribution_type', 'paid_social'
        );
      WHEN LOWER(p_utm_source) LIKE '%facebook%' AND LOWER(p_utm_medium) = 'ppc' THEN
        result := jsonb_build_object(
          'primary_source', 'facebook_ads',
          'source_category', 'facebook_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'attribution_type', 'paid_social'
        );
      WHEN LOWER(p_utm_source) LIKE '%google%' AND LOWER(p_utm_medium) = 'cpc' THEN
        result := jsonb_build_object(
          'primary_source', 'google_ads',
          'source_category', 'google_ads',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'attribution_type', 'paid_search'
        );
      WHEN LOWER(p_utm_medium) = 'email' THEN
        result := jsonb_build_object(
          'primary_source', 'email_marketing',
          'source_category', 'email_marketing',
          'specific_source', p_utm_campaign,
          'confidence', 'high',
          'attribution_type', 'email'
        );
      WHEN LOWER(p_utm_medium) IN ('social', 'organic_social') THEN
        result := jsonb_build_object(
          'primary_source', 'social_organic',
          'source_category', 'social_organic',
          'specific_source', p_utm_source,
          'confidence', 'medium',
          'attribution_type', 'organic_social'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', p_utm_source,
          'source_category', 'unknown',
          'specific_source', p_utm_campaign,
          'confidence', 'medium',
          'attribution_type', 'other'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Session source fallback
  IF p_session_source IS NOT NULL THEN
    CASE LOWER(p_session_source)
      WHEN 'social media' THEN
        result := jsonb_build_object(
          'primary_source', 'social_organic',
          'source_category', 'social_organic',
          'specific_source', 'Organic Social',
          'confidence', 'low',
          'attribution_type', 'organic_social'
        );
      ELSE
        result := jsonb_build_object(
          'primary_source', p_session_source,
          'source_category', 'unknown',
          'specific_source', p_session_source,
          'confidence', 'low',
          'attribution_type', 'other'
        );
    END CASE;
    RETURN result;
  END IF;

  -- Default unknown
  RETURN jsonb_build_object(
    'primary_source', 'unknown',
    'source_category', 'unknown',
    'specific_source', null,
    'confidence', 'none',
    'attribution_type', 'unknown'
  );
END;
$$;

-- 7. Update the source attribution summary view to include enhanced attribution
DROP VIEW IF EXISTS source_attribution_summary;
CREATE VIEW source_attribution_summary AS
WITH attribution_data AS (
  SELECT 
    a.account_id,
    'appointment' as record_type,
    a.ghl_source,
    a.source_category as ghl_source_category,
    a.specific_source as ghl_specific_source,
    a.contact_source,
    a.contact_utm_source,
    a.contact_utm_medium,
    a.contact_utm_campaign,
    -- Enhanced attribution fields
    a.utm_source,
    a.utm_medium,
    a.utm_campaign,
    a.utm_content,
    a.utm_term,
    a.utm_id,
    a.fbclid,
    a.session_source,
    a.landing_url,
    a.lead_value,
    a.lead_path,
    a.business_type,
    (a.attribution_data->>'primary_source') as enhanced_primary_source,
    (a.attribution_data->>'source_category') as enhanced_source_category,
    (a.attribution_data->>'attribution_type') as attribution_type,
    (a.attribution_data->>'confidence') as attribution_confidence,
    a.created_at
  FROM appointments a
  WHERE a.created_at >= CURRENT_DATE - INTERVAL '90 days'
  
  UNION ALL
  
  SELECT 
    d.account_id,
    'discovery' as record_type,
    d.ghl_source,
    d.source_category as ghl_source_category,
    d.specific_source as ghl_specific_source,
    d.contact_source,
    d.contact_utm_source,
    d.contact_utm_medium,
    d.contact_utm_campaign,
    -- Enhanced attribution fields
    d.utm_source,
    d.utm_medium,
    d.utm_campaign,
    d.utm_content,
    d.utm_term,
    d.utm_id,
    d.fbclid,
    d.session_source,
    d.landing_url,
    d.lead_value,
    d.lead_path,
    d.business_type,
    (d.attribution_data->>'primary_source') as enhanced_primary_source,
    (d.attribution_data->>'source_category') as enhanced_source_category,
    (d.attribution_data->>'attribution_type') as attribution_type,
    (d.attribution_data->>'confidence') as attribution_confidence,
    d.created_at
  FROM discoveries d
  WHERE d.created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
  account_id,
  record_type,
  
  -- Traditional attribution
  ghl_source,
  ghl_source_category,
  contact_source,
  
  -- Enhanced attribution
  utm_source,
  utm_campaign,
  enhanced_primary_source,
  enhanced_source_category,
  attribution_type,
  
  -- Aggregated metrics
  COUNT(*) as total_records,
  COUNT(DISTINCT utm_id) as unique_campaigns,
  COUNT(*) FILTER (WHERE attribution_confidence = 'high') as high_confidence_count,
  COUNT(*) FILTER (WHERE lead_value = '$100K+') as high_value_leads,
  COUNT(*) FILTER (WHERE fbclid IS NOT NULL) as facebook_attributed,
  
  -- Business intelligence
  array_agg(DISTINCT lead_value) FILTER (WHERE lead_value IS NOT NULL) as lead_values,
  array_agg(DISTINCT lead_path) FILTER (WHERE lead_path IS NOT NULL) as lead_paths,
  array_agg(DISTINCT business_type) FILTER (WHERE business_type IS NOT NULL) as business_types,
  
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM attribution_data
GROUP BY 
  account_id, 
  record_type, 
  ghl_source, 
  ghl_source_category,
  contact_source,
  utm_source,
  utm_campaign,
  enhanced_primary_source,
  enhanced_source_category,
  attribution_type
ORDER BY total_records DESC; 