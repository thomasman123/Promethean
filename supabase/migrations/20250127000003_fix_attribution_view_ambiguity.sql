-- Fix ambiguous column references in source_attribution_summary view
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
    (a.last_attribution_source->>'primary_source') as contact_primary_source,
    (a.last_attribution_source->>'source_category') as contact_source_category,
    (a.last_attribution_source->>'specific_source') as contact_specific_source,
    (a.last_attribution_source->>'confidence') as attribution_confidence,
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
    (d.last_attribution_source->>'primary_source') as contact_primary_source,
    (d.last_attribution_source->>'source_category') as contact_source_category,
    (d.last_attribution_source->>'specific_source') as contact_specific_source,
    (d.last_attribution_source->>'confidence') as attribution_confidence,
    d.created_at
  FROM discoveries d
  WHERE d.created_at >= CURRENT_DATE - INTERVAL '90 days'
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