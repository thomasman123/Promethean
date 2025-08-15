-- Deprecate form-based mappings and provide cleanup functions
-- This migration marks the old system as deprecated and provides tools to clean up

-- 1. Add deprecation flags to old tables
ALTER TABLE contact_source_mappings ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT true;
ALTER TABLE ghl_source_mappings ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT true;

-- 2. Mark all existing mappings as deprecated
UPDATE contact_source_mappings SET is_deprecated = true WHERE is_deprecated IS NULL;
UPDATE ghl_source_mappings SET is_deprecated = true WHERE is_deprecated IS NULL;

-- 3. Create function to identify problematic form-based mappings
CREATE OR REPLACE FUNCTION get_problematic_form_mappings(p_account_id UUID)
RETURNS TABLE(
  mapping_type TEXT,
  source_name TEXT,
  category TEXT,
  usage_count BIGINT,
  problem_description TEXT,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  -- Contact source mappings that are too generic
  SELECT 
    'contact'::TEXT as mapping_type,
    csm.contact_source as source_name,
    csm.source_category as category,
    COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE account_id = p_account_id AND contact_source = csm.contact_source) +
      (SELECT COUNT(*) FROM discoveries WHERE account_id = p_account_id AND contact_source = csm.contact_source),
      0
    )::BIGINT as usage_count,
    CASE 
      WHEN LOWER(csm.contact_source) LIKE '%form%' THEN 'Form name provides no attribution value'
      WHEN LOWER(csm.contact_source) LIKE '%api%' THEN 'API source provides no business insight'
      WHEN LOWER(csm.contact_source) LIKE '%meeting%' THEN 'Meeting reference is not a lead source'
      ELSE 'Generic source name without attribution context'
    END as problem_description,
    'Map based on UTM parameters instead of form names' as recommended_action
  FROM contact_source_mappings csm
  WHERE csm.account_id = p_account_id
    AND csm.is_deprecated = true
    AND (
      LOWER(csm.contact_source) LIKE '%form%' OR
      LOWER(csm.contact_source) LIKE '%api%' OR
      LOWER(csm.contact_source) LIKE '%meeting%' OR
      LOWER(csm.contact_source) LIKE '%demo%' OR
      LOWER(csm.contact_source) LIKE '%call%'
    )
  
  UNION ALL
  
  -- GHL source mappings that are too technical
  SELECT 
    'ghl'::TEXT as mapping_type,
    gsm.ghl_source as source_name,
    gsm.source_category as category,
    COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source) +
      (SELECT COUNT(*) FROM discoveries WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source),
      0
    )::BIGINT as usage_count,
    'GHL internal source provides no marketing attribution' as problem_description,
    'Use UTM parameters for actual traffic source attribution' as recommended_action
  FROM ghl_source_mappings gsm
  WHERE gsm.account_id = p_account_id
    AND gsm.is_deprecated = true;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to suggest UTM alternatives for form mappings
CREATE OR REPLACE FUNCTION suggest_utm_alternatives_for_forms(p_account_id UUID)
RETURNS TABLE(
  old_mapping TEXT,
  suggested_utm_source TEXT,
  suggested_utm_medium TEXT,
  suggested_category TEXT,
  reasoning TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  WITH form_analysis AS (
    SELECT 
      csm.contact_source,
      csm.source_category,
      -- Analyze actual UTM data for this contact source
      (
        SELECT mode() WITHIN GROUP (ORDER BY utm_source) 
        FROM (
          SELECT utm_source FROM appointments 
          WHERE account_id = p_account_id AND contact_source = csm.contact_source
          UNION ALL
          SELECT utm_source FROM discoveries 
          WHERE account_id = p_account_id AND contact_source = csm.contact_source
        ) utm_data
        WHERE utm_source IS NOT NULL
      ) as common_utm_source,
      (
        SELECT mode() WITHIN GROUP (ORDER BY utm_medium)
        FROM (
          SELECT utm_medium FROM appointments 
          WHERE account_id = p_account_id AND contact_source = csm.contact_source
          UNION ALL
          SELECT utm_medium FROM discoveries 
          WHERE account_id = p_account_id AND contact_source = csm.contact_source
        ) utm_data
        WHERE utm_medium IS NOT NULL
      ) as common_utm_medium
    FROM contact_source_mappings csm
    WHERE csm.account_id = p_account_id 
      AND csm.is_deprecated = true
  )
  SELECT 
    fa.contact_source as old_mapping,
    COALESCE(fa.common_utm_source, 'unknown') as suggested_utm_source,
    COALESCE(fa.common_utm_medium, 'unknown') as suggested_utm_medium,
    CASE 
      WHEN fa.common_utm_source = 'ig' AND fa.common_utm_medium = 'ppc' THEN 'instagram_ads'
      WHEN fa.common_utm_source = 'fb' AND fa.common_utm_medium = 'ppc' THEN 'facebook_ads'
      WHEN fa.common_utm_medium = 'email' THEN 'email_marketing'
      WHEN fa.common_utm_medium IN ('social', 'organic') THEN 'social_organic'
      ELSE fa.source_category
    END as suggested_category,
    CASE 
      WHEN fa.common_utm_source IS NOT NULL AND fa.common_utm_medium IS NOT NULL THEN
        CONCAT('Found common UTM pattern: ', fa.common_utm_source, ' + ', fa.common_utm_medium)
      WHEN fa.common_utm_source IS NOT NULL THEN
        CONCAT('Found common UTM source: ', fa.common_utm_source)
      WHEN fa.common_utm_medium IS NOT NULL THEN
        CONCAT('Found common UTM medium: ', fa.common_utm_medium)
      ELSE
        'No UTM data found - manual categorization needed'
    END as reasoning
  FROM form_analysis fa;
END;
$$ LANGUAGE plpgsql;

-- 5. Create cleanup function to remove unused form mappings
CREATE OR REPLACE FUNCTION cleanup_unused_form_mappings(p_account_id UUID, p_dry_run BOOLEAN DEFAULT true)
RETURNS TABLE(
  action TEXT,
  mapping_type TEXT,
  source_name TEXT,
  usage_count BIGINT,
  will_be_deleted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  
  -- Contact source mappings with zero usage
  SELECT 
    'DELETE'::TEXT as action,
    'contact'::TEXT as mapping_type,
    csm.contact_source as source_name,
    COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE account_id = p_account_id AND contact_source = csm.contact_source) +
      (SELECT COUNT(*) FROM discoveries WHERE account_id = p_account_id AND contact_source = csm.contact_source),
      0
    )::BIGINT as usage_count,
    true as will_be_deleted
  FROM contact_source_mappings csm
  WHERE csm.account_id = p_account_id
    AND csm.is_deprecated = true
    AND NOT EXISTS (
      SELECT 1 FROM appointments WHERE account_id = p_account_id AND contact_source = csm.contact_source
      UNION
      SELECT 1 FROM discoveries WHERE account_id = p_account_id AND contact_source = csm.contact_source
    )
  
  UNION ALL
  
  -- GHL source mappings with zero usage  
  SELECT 
    'DELETE'::TEXT as action,
    'ghl'::TEXT as mapping_type,
    gsm.ghl_source as source_name,
    COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source) +
      (SELECT COUNT(*) FROM discoveries WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source),
      0
    )::BIGINT as usage_count,
    true as will_be_deleted
  FROM ghl_source_mappings gsm
  WHERE gsm.account_id = p_account_id
    AND gsm.is_deprecated = true
    AND NOT EXISTS (
      SELECT 1 FROM appointments WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source
      UNION
      SELECT 1 FROM discoveries WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source
    );
  
  -- Actually delete if not dry run
  IF NOT p_dry_run THEN
    DELETE FROM contact_source_mappings csm
    WHERE csm.account_id = p_account_id
      AND csm.is_deprecated = true
      AND NOT EXISTS (
        SELECT 1 FROM appointments WHERE account_id = p_account_id AND contact_source = csm.contact_source
        UNION
        SELECT 1 FROM discoveries WHERE account_id = p_account_id AND contact_source = csm.contact_source
      );
      
    DELETE FROM ghl_source_mappings gsm
    WHERE gsm.account_id = p_account_id
      AND gsm.is_deprecated = true
      AND NOT EXISTS (
        SELECT 1 FROM appointments WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source
        UNION
        SELECT 1 FROM discoveries WHERE account_id = p_account_id AND ghl_source = gsm.ghl_source
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Add helpful comments
COMMENT ON COLUMN contact_source_mappings.is_deprecated IS 'Form-based mappings are deprecated in favor of UTM-based attribution';
COMMENT ON COLUMN ghl_source_mappings.is_deprecated IS 'GHL source mappings are deprecated in favor of UTM-based attribution';
COMMENT ON FUNCTION get_problematic_form_mappings IS 'Identifies form-based mappings that provide no attribution value';
COMMENT ON FUNCTION suggest_utm_alternatives_for_forms IS 'Suggests UTM-based alternatives for existing form mappings';
COMMENT ON FUNCTION cleanup_unused_form_mappings IS 'Removes deprecated mappings with zero usage';

-- 7. Add a warning view for deprecated mappings
CREATE OR REPLACE VIEW deprecated_mappings_summary AS
SELECT 
  account_id,
  'contact_source' as mapping_type,
  COUNT(*) as deprecated_count,
  SUM(CASE WHEN EXISTS (
    SELECT 1 FROM appointments WHERE account_id = csm.account_id AND contact_source = csm.contact_source
    UNION
    SELECT 1 FROM discoveries WHERE account_id = csm.account_id AND contact_source = csm.contact_source
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