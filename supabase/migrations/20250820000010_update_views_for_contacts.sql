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

-- deprecated_mappings_summary updated to check usage via contacts
DROP VIEW IF EXISTS deprecated_mappings_summary;
CREATE OR REPLACE VIEW deprecated_mappings_summary AS
SELECT 
  account_id,
  'contact_source' as mapping_type,
  COUNT(*) as deprecated_count,
  SUM(CASE WHEN EXISTS (
    SELECT 1 FROM appointments a
    LEFT JOIN contacts c ON c.id = a.contact_id
    WHERE a.account_id = csm.account_id AND c.source = csm.contact_source
    UNION
    SELECT 1 FROM discoveries d
    LEFT JOIN contacts c ON c.id = d.contact_id
    WHERE d.account_id = csm.account_id AND c.source = csm.contact_source
  ) THEN 1 ELSE 0 END) as with_data_count,
  NOW() as last_checked
FROM contact_source_mappings csm
WHERE is_deprecated = true
GROUP BY account_id

UNION ALL

SELECT 
  account_id,
  'ghl_source' as mapping_type,
  COUNT(*) as deprecated_count,
  SUM(CASE WHEN EXISTS (
    SELECT 1 FROM appointments WHERE account_id = gsm.account_id AND ghl_source = gsm.ghl_source
    UNION
    SELECT 1 FROM discoveries WHERE account_id = gsm.account_id AND ghl_source = gsm.ghl_source
  ) THEN 1 ELSE 0 END) as with_data_count,
  NOW() as last_checked
FROM ghl_source_mappings gsm
WHERE is_deprecated = true
GROUP BY account_id; 

-- attribution_monitoring updated to reference contact attribution from contacts
DROP VIEW IF EXISTS attribution_monitoring;
CREATE OR REPLACE VIEW attribution_monitoring AS
SELECT 
  a.id as account_id,
  a.name as account_name,
  aas.auto_attribution_enabled,
  aas.auto_create_utm_mappings,
  aas.require_manual_approval,
  aas.auto_confidence_threshold,
  -- Count of auto-created mappings
  (SELECT COUNT(*) FROM utm_attribution_mappings uam 
   WHERE uam.account_id = a.id AND uam.auto_created = true AND uam.mapping_status = 'active') as auto_mappings_active,
  -- Count of pending mappings
  (SELECT COUNT(*) FROM utm_attribution_mappings uam 
   WHERE uam.account_id = a.id AND uam.mapping_status = 'pending_approval') as mappings_pending,
  -- Recent activity (using contacts attribution data on recent appointments)
  (SELECT COUNT(*) FROM appointments apt 
   LEFT JOIN contacts c ON c.id = apt.contact_id
   WHERE apt.account_id = a.id 
   AND apt.created_at > NOW() - INTERVAL '7 days'
   AND COALESCE((c.attribution_source->>'mapping_type'), (c.last_attribution_source->>'mapping_type')) LIKE 'auto%') as auto_attributed_last_week,
  aas.updated_at as settings_last_updated
FROM accounts a
LEFT JOIN account_attribution_settings aas ON aas.account_id = a.id
WHERE a.is_active = true; 

-- discovery_appointment_flow updated to use contacts identity
DROP VIEW IF EXISTS discovery_appointment_flow;
CREATE OR REPLACE VIEW discovery_appointment_flow AS
SELECT 
    d.id as discovery_id,
    COALESCE(c.name, 'Unknown') as contact_name,
    c.phone,
    c.email,
    d.setter as booked_user,
    d.date_booked_for as discovery_date,
    d.show_outcome,
    d.linked_appointment_id,
    a.id as appointment_id,
    a.setter as appointment_setter,
    a.sales_rep as appointment_sales_rep,
    a.date_booked_for as appointment_date,
    a.call_outcome as appointment_outcome,
    d.account_id
FROM discoveries d
LEFT JOIN appointments a ON d.linked_appointment_id = a.id
LEFT JOIN contacts c ON c.id = d.contact_id
ORDER BY d.date_booked_for DESC; 