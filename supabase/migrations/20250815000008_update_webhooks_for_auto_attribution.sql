-- Update webhook system to use automatic attribution
-- This modifies existing functions to use the new auto attribution system

-- 1. Create helper function for webhook attribution
CREATE OR REPLACE FUNCTION process_webhook_attribution(
  p_account_id UUID,
  p_contact_data JSONB,
  p_appointment_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  attribution_data JSONB;
  contact_attribution JSONB;
  utm_source TEXT;
  utm_medium TEXT;
  utm_campaign TEXT;
  utm_content TEXT;
  utm_term TEXT;
  fbclid TEXT;
  session_source TEXT;
BEGIN
  -- Extract attribution data from contact
  contact_attribution := p_contact_data->'attributionSource';
  
  -- Extract UTM parameters
  utm_source := contact_attribution->>'utmSource';
  utm_medium := contact_attribution->>'utmMedium';
  utm_campaign := contact_attribution->>'campaign';
  utm_content := contact_attribution->>'utmContent';
  utm_term := contact_attribution->>'utmTerm';
  fbclid := contact_attribution->>'fbclid';
  session_source := contact_attribution->>'sessionSource';

  -- Use automatic attribution with account settings
  attribution_data := auto_classify_and_create_mapping(
    p_account_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    NULL, -- gclid
    session_source,
    NULL  -- referrer
  );

  -- Add webhook-specific metadata
  attribution_data := attribution_data || jsonb_build_object(
    'processed_at', NOW(),
    'webhook_source', 'ghl_contact',
    'original_contact_source', p_contact_data->>'source',
    'original_attribution', contact_attribution
  );

  RETURN attribution_data;
END;
$$;

-- 2. Function to update existing records with new attribution
CREATE OR REPLACE FUNCTION backfill_automatic_attribution(p_account_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  record_type TEXT,
  record_id UUID,
  old_attribution TEXT,
  new_attribution JSONB,
  status TEXT
) AS $$
DECLARE
  rec RECORD;
  new_attr JSONB;
BEGIN
  -- Process appointments
  FOR rec IN 
    SELECT id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, 
           fbclid, session_source, last_attribution_source
    FROM appointments 
    WHERE account_id = p_account_id 
      AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR fbclid IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT p_limit
  LOOP
    new_attr := auto_classify_and_create_mapping(
      p_account_id,
      rec.utm_source,
      rec.utm_medium,
      rec.utm_campaign,
      rec.utm_content,
      rec.utm_term,
      rec.fbclid,
      NULL, -- gclid
      rec.session_source,
      NULL  -- referrer
    );

    -- Update the record
    UPDATE appointments 
    SET last_attribution_source = new_attr
    WHERE id = rec.id;

    RETURN QUERY SELECT 
      'appointment'::TEXT,
      rec.id,
      rec.last_attribution_source::TEXT,
      new_attr,
      'updated'::TEXT;
  END LOOP;

  -- Process discoveries
  FOR rec IN 
    SELECT id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, 
           fbclid, session_source, last_attribution_source
    FROM discoveries 
    WHERE account_id = p_account_id 
      AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR fbclid IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT p_limit
  LOOP
    new_attr := auto_classify_and_create_mapping(
      p_account_id,
      rec.utm_source,
      rec.utm_medium,
      rec.utm_campaign,
      rec.utm_content,
      rec.utm_term,
      rec.fbclid,
      NULL, -- gclid
      rec.session_source,
      NULL  -- referrer
    );

    -- Update the record
    UPDATE discoveries 
    SET last_attribution_source = new_attr
    WHERE id = rec.id;

    RETURN QUERY SELECT 
      'discovery'::TEXT,
      rec.id,
      rec.last_attribution_source::TEXT,
      new_attr,
      'updated'::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get attribution statistics per account
CREATE OR REPLACE FUNCTION get_attribution_stats(p_account_id UUID)
RETURNS TABLE(
  total_records BIGINT,
  auto_attributed BIGINT,
  manual_attributed BIGINT,
  pending_approval BIGINT,
  top_sources JSONB,
  confidence_breakdown JSONB
) AS $$
DECLARE
  stats JSONB := '{}';
BEGIN
  RETURN QUERY
  WITH attribution_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE (last_attribution_source->>'mapping_type')::text LIKE 'auto%') as auto_count,
      COUNT(*) FILTER (WHERE (last_attribution_source->>'mapping_type')::text = 'manual_mapped') as manual_count,
      jsonb_object_agg(
        last_attribution_source->>'source_category',
        COUNT(*)
      ) FILTER (WHERE last_attribution_source->>'source_category' IS NOT NULL) as source_breakdown,
      jsonb_object_agg(
        last_attribution_source->>'confidence',
        COUNT(*)
      ) FILTER (WHERE last_attribution_source->>'confidence' IS NOT NULL) as confidence_breakdown
    FROM (
      SELECT last_attribution_source FROM appointments WHERE account_id = p_account_id
      UNION ALL
      SELECT last_attribution_source FROM discoveries WHERE account_id = p_account_id
    ) combined
    WHERE last_attribution_source IS NOT NULL
  ),
  pending_stats AS (
    SELECT COUNT(*) as pending_count
    FROM utm_attribution_mappings
    WHERE account_id = p_account_id AND mapping_status = 'pending_approval'
  )
  SELECT 
    s.total::BIGINT,
    s.auto_count::BIGINT,
    s.manual_count::BIGINT,
    p.pending_count::BIGINT,
    s.source_breakdown,
    s.confidence_breakdown
  FROM attribution_stats s, pending_stats p;
END;
$$ LANGUAGE plpgsql;

-- 4. Add comments
COMMENT ON FUNCTION process_webhook_attribution IS 'Processes webhook data through automatic attribution system';
COMMENT ON FUNCTION backfill_automatic_attribution IS 'Updates existing records with new automatic attribution';
COMMENT ON FUNCTION get_attribution_stats IS 'Returns attribution statistics for monitoring and reporting';

-- 5. Create a view for attribution monitoring
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
  -- Recent activity
  (SELECT COUNT(*) FROM appointments apt 
   WHERE apt.account_id = a.id 
   AND apt.created_at > NOW() - INTERVAL '7 days'
   AND apt.last_attribution_source->>'mapping_type' LIKE 'auto%') as auto_attributed_last_week,
  aas.updated_at as settings_last_updated
FROM accounts a
LEFT JOIN account_attribution_settings aas ON aas.account_id = a.id
WHERE a.is_active = true; 