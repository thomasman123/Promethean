-- Update dependent views to use contacts table via contact_id

-- source_attribution_summary
DROP VIEW IF EXISTS source_attribution_summary;
CREATE VIEW source_attribution_summary AS
WITH attribution_data AS (
  SELECT 
    a.account_id,
    'appointment' as record_type,
    a.ghl_source,
    a.source_category as ghl_source_category,
    a.specific_source as ghl_specific_source,
    -- Contact attribution via contacts
    c.source as contact_source,
    (c.last_attribution_source->>'utmSource') as contact_utm_source,
    (c.last_attribution_source->>'utmMedium') as contact_utm_medium,
    (c.last_attribution_source->>'campaign') as contact_utm_campaign,
    -- Enhanced attribution from contacts if present
    (c.attribution_source->>'utmSource') as utm_source,
    (c.attribution_source->>'utmMedium') as utm_medium,
    (c.attribution_source->>'campaign') as utm_campaign,
    (c.attribution_source->>'utmContent') as utm_content,
    (c.attribution_source->>'utmTerm') as utm_term,
    (c.attribution_source->>'utm_id') as utm_id,
    (c.attribution_source->>'fbclid') as fbclid,
    (c.attribution_source->>'sessionSource') as session_source,
    (c.attribution_source->>'url') as landing_url,
    a.lead_value,
    a.lead_path,
    a.business_type,
    (c.attribution_source->>'primary_source') as enhanced_primary_source,
    (c.attribution_source->>'source_category') as enhanced_source_category,
    (c.attribution_source->>'attribution_type') as attribution_type,
    (c.attribution_source->>'confidence') as attribution_confidence,
    a.created_at
  FROM appointments a
  LEFT JOIN contacts c ON c.id = a.contact_id
  WHERE a.created_at >= CURRENT_DATE - INTERVAL '90 days'
  
  UNION ALL
  
  SELECT 
    d.account_id,
    'discovery' as record_type,
    d.ghl_source,
    d.source_category as ghl_source_category,
    d.specific_source as ghl_specific_source,
    -- Contact attribution via contacts
    c.source as contact_source,
    (c.last_attribution_source->>'utmSource') as contact_utm_source,
    (c.last_attribution_source->>'utmMedium') as contact_utm_medium,
    (c.last_attribution_source->>'campaign') as contact_utm_campaign,
    -- Enhanced attribution from contacts if present
    (c.attribution_source->>'utmSource') as utm_source,
    (c.attribution_source->>'utmMedium') as utm_medium,
    (c.attribution_source->>'campaign') as utm_campaign,
    (c.attribution_source->>'utmContent') as utm_content,
    (c.attribution_source->>'utmTerm') as utm_term,
    (c.attribution_source->>'utm_id') as utm_id,
    (c.attribution_source->>'fbclid') as fbclid,
    (c.attribution_source->>'sessionSource') as session_source,
    (c.attribution_source->>'url') as landing_url,
    d.lead_value,
    d.lead_path,
    d.business_type,
    (c.attribution_source->>'primary_source') as enhanced_primary_source,
    (c.attribution_source->>'source_category') as enhanced_source_category,
    (c.attribution_source->>'attribution_type') as attribution_type,
    (c.attribution_source->>'confidence') as attribution_confidence,
    d.created_at
  FROM discoveries d
  LEFT JOIN contacts c ON c.id = d.contact_id
  WHERE d.created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
  account_id,
  record_type,
  
  -- Traditional attribution
  ghl_source,
  ghl_source_category,
  contact_source,
  
  -- Enhanced attribution (from contacts)
  enhanced_primary_source,
  enhanced_source_category,
  attribution_type,
  attribution_confidence,
  
  -- UTM rollups (from contacts)
  utm_source,
  utm_medium,
  utm_campaign,
  
  -- Counts
  COUNT(*) FILTER (WHERE ghl_source IS NOT NULL) as ghl_source_count,
  COUNT(*) FILTER (WHERE enhanced_primary_source IS NOT NULL) as enhanced_attribution_count,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE attribution_confidence = 'high') as high_confidence_count,
  COUNT(*) FILTER (WHERE attribution_confidence = 'medium') as medium_confidence_count,
  COUNT(*) FILTER (WHERE attribution_confidence = 'low') as low_confidence_count,
  
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM attribution_data
GROUP BY 
  account_id, record_type, 
  ghl_source, ghl_source_category,
  contact_source,
  enhanced_primary_source, enhanced_source_category, attribution_type, attribution_confidence,
  utm_source, utm_medium, utm_campaign; 