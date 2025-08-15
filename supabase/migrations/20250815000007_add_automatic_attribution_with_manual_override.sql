-- Add automatic attribution with manual override per account
-- This allows accounts to choose between automatic UTM attribution and manual mapping

-- 1. Add account-level attribution settings
CREATE TABLE IF NOT EXISTS account_attribution_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  auto_attribution_enabled BOOLEAN DEFAULT true,
  auto_create_utm_mappings BOOLEAN DEFAULT true,
  require_manual_approval BOOLEAN DEFAULT false,
  auto_confidence_threshold VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id)
);

-- 2. Add RLS policies for attribution settings
ALTER TABLE account_attribution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attribution settings for their account" ON account_attribution_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = account_attribution_settings.account_id
      AND account_access.is_active = true
    )
  );

CREATE POLICY "Admins can manage attribution settings" ON account_attribution_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.user_id = auth.uid() 
      AND account_access.account_id = account_attribution_settings.account_id
      AND account_access.is_active = true
      AND account_access.role IN ('admin', 'moderator')
    )
  );

-- 3. Create default settings for existing accounts
INSERT INTO account_attribution_settings (account_id, auto_attribution_enabled, auto_create_utm_mappings)
SELECT id, true, true FROM accounts
ON CONFLICT (account_id) DO NOTHING;

-- 4. Add status tracking to UTM mappings
ALTER TABLE utm_attribution_mappings ADD COLUMN IF NOT EXISTS mapping_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE utm_attribution_mappings ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;
ALTER TABLE utm_attribution_mappings ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20) DEFAULT 'high';

-- Update existing mappings
UPDATE utm_attribution_mappings SET 
  mapping_status = 'active',
  auto_created = false,
  confidence_level = 'high'
WHERE mapping_status IS NULL;

-- 5. Enhanced automatic attribution function with account settings
CREATE OR REPLACE FUNCTION auto_classify_and_create_mapping(
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
  settings RECORD;
  existing_mapping RECORD;
  suggested_mapping JSONB;
  new_mapping_id UUID;
BEGIN
  -- Get account attribution settings
  SELECT * INTO settings
  FROM account_attribution_settings
  WHERE account_id = p_account_id;
  
  -- If no settings found, create default
  IF NOT FOUND THEN
    INSERT INTO account_attribution_settings (account_id) VALUES (p_account_id);
    SELECT * INTO settings FROM account_attribution_settings WHERE account_id = p_account_id;
  END IF;

  -- If auto attribution is disabled, use manual classification
  IF NOT settings.auto_attribution_enabled THEN
    RETURN classify_utm_attribution(
      p_account_id, p_utm_source, p_utm_medium, p_utm_campaign,
      p_utm_content, p_utm_term, p_fbclid, p_gclid, p_session_source, p_referrer
    );
  END IF;

  -- Check if mapping already exists
  SELECT * INTO existing_mapping
  FROM utm_attribution_mappings
  WHERE account_id = p_account_id 
    AND (utm_source = p_utm_source OR (utm_source IS NULL AND p_utm_source IS NULL))
    AND (utm_medium = p_utm_medium OR (utm_medium IS NULL AND p_utm_medium IS NULL))
    AND is_active = true;

  -- If mapping exists, use it
  IF FOUND THEN
    result := jsonb_build_object(
      'primary_source', COALESCE(p_utm_source, 'unknown'),
      'source_category', existing_mapping.source_category,
      'specific_source', existing_mapping.specific_source,
      'campaign', p_utm_campaign,
      'confidence', existing_mapping.confidence_level,
      'mapping_type', CASE WHEN existing_mapping.auto_created THEN 'auto_mapped' ELSE 'manual_mapped' END,
      'mapping_id', existing_mapping.id
    );
    RETURN result;
  END IF;

  -- Auto-create mapping if enabled and UTM data is available
  IF settings.auto_create_utm_mappings AND (p_utm_source IS NOT NULL OR p_utm_medium IS NOT NULL) THEN
    -- Get suggested mapping
    suggested_mapping := get_utm_mapping_suggestions(p_utm_source, p_utm_medium, ARRAY[p_utm_campaign]);
    
    -- Only auto-create if confidence meets threshold
    IF (suggested_mapping->>'confidence')::text = 'high' OR 
       (settings.auto_confidence_threshold = 'medium' AND (suggested_mapping->>'confidence')::text IN ('high', 'medium')) OR
       (settings.auto_confidence_threshold = 'low') THEN
      
      -- Create the mapping
      INSERT INTO utm_attribution_mappings (
        account_id,
        utm_source,
        utm_medium,
        source_category,
        specific_source,
        description,
        auto_created,
        confidence_level,
        mapping_status,
        priority
      ) VALUES (
        p_account_id,
        NULLIF(p_utm_source, ''),
        NULLIF(p_utm_medium, ''),
        suggested_mapping->>'source_category',
        suggested_mapping->>'specific_source',
        CONCAT('Auto-created: ', suggested_mapping->>'reason'),
        true,
        suggested_mapping->>'confidence',
        CASE WHEN settings.require_manual_approval THEN 'pending_approval' ELSE 'active' END,
        10 -- High priority for auto-created
      ) RETURNING id INTO new_mapping_id;

      result := jsonb_build_object(
        'primary_source', COALESCE(p_utm_source, 'unknown'),
        'source_category', suggested_mapping->>'source_category',
        'specific_source', suggested_mapping->>'specific_source',
        'campaign', p_utm_campaign,
        'confidence', suggested_mapping->>'confidence',
        'mapping_type', 'auto_created',
        'mapping_id', new_mapping_id,
        'requires_approval', settings.require_manual_approval
      );
      RETURN result;
    END IF;
  END IF;

  -- Fallback to manual classification
  RETURN classify_utm_attribution(
    p_account_id, p_utm_source, p_utm_medium, p_utm_campaign,
    p_utm_content, p_utm_term, p_fbclid, p_gclid, p_session_source, p_referrer
  );
END;
$$;

-- 6. Function to get pending mappings for approval
CREATE OR REPLACE FUNCTION get_pending_attribution_mappings(p_account_id UUID)
RETURNS TABLE(
  id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  source_category TEXT,
  specific_source TEXT,
  description TEXT,
  confidence_level TEXT,
  usage_count BIGINT,
  sample_campaigns TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uam.id,
    uam.utm_source,
    uam.utm_medium,
    uam.source_category,
    uam.specific_source,
    uam.description,
    uam.confidence_level,
    COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE account_id = p_account_id AND utm_source = uam.utm_source AND utm_medium = uam.utm_medium) +
      (SELECT COUNT(*) FROM discoveries WHERE account_id = p_account_id AND utm_source = uam.utm_source AND utm_medium = uam.utm_medium),
      0
    )::BIGINT as usage_count,
    COALESCE(
      (SELECT array_agg(DISTINCT utm_campaign) FILTER (WHERE utm_campaign IS NOT NULL)
       FROM (
         SELECT utm_campaign FROM appointments WHERE account_id = p_account_id AND utm_source = uam.utm_source AND utm_medium = uam.utm_medium
         UNION ALL
         SELECT utm_campaign FROM discoveries WHERE account_id = p_account_id AND utm_source = uam.utm_source AND utm_medium = uam.utm_medium
       ) campaigns),
      ARRAY[]::TEXT[]
    ) as sample_campaigns,
    uam.created_at
  FROM utm_attribution_mappings uam
  WHERE uam.account_id = p_account_id
    AND uam.mapping_status = 'pending_approval'
    AND uam.auto_created = true
  ORDER BY uam.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to approve/reject auto-created mappings
CREATE OR REPLACE FUNCTION manage_auto_mapping(
  p_account_id UUID,
  p_mapping_id UUID,
  p_action TEXT, -- 'approve', 'reject', 'modify'
  p_new_category TEXT DEFAULT NULL,
  p_new_specific_source TEXT DEFAULT NULL,
  p_new_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  IF p_action = 'approve' THEN
    UPDATE utm_attribution_mappings 
    SET mapping_status = 'active', updated_at = NOW()
    WHERE id = p_mapping_id AND account_id = p_account_id;
    
    result := jsonb_build_object('status', 'approved', 'mapping_id', p_mapping_id);
    
  ELSIF p_action = 'reject' THEN
    DELETE FROM utm_attribution_mappings
    WHERE id = p_mapping_id AND account_id = p_account_id AND auto_created = true;
    
    result := jsonb_build_object('status', 'rejected', 'mapping_id', p_mapping_id);
    
  ELSIF p_action = 'modify' THEN
    UPDATE utm_attribution_mappings
    SET 
      source_category = COALESCE(p_new_category, source_category),
      specific_source = COALESCE(p_new_specific_source, specific_source),
      description = COALESCE(p_new_description, description),
      mapping_status = 'active',
      auto_created = false, -- Mark as manually modified
      updated_at = NOW()
    WHERE id = p_mapping_id AND account_id = p_account_id;
    
    result := jsonb_build_object('status', 'modified', 'mapping_id', p_mapping_id);
  ELSE
    result := jsonb_build_object('error', 'Invalid action. Use approve, reject, or modify');
  END IF;
  
  RETURN result;
END;
$$;

-- 8. Function to update account attribution settings
CREATE OR REPLACE FUNCTION update_attribution_settings(
  p_account_id UUID,
  p_auto_attribution_enabled BOOLEAN DEFAULT NULL,
  p_auto_create_utm_mappings BOOLEAN DEFAULT NULL,
  p_require_manual_approval BOOLEAN DEFAULT NULL,
  p_auto_confidence_threshold TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO account_attribution_settings (
    account_id,
    auto_attribution_enabled,
    auto_create_utm_mappings,
    require_manual_approval,
    auto_confidence_threshold,
    updated_at
  ) VALUES (
    p_account_id,
    COALESCE(p_auto_attribution_enabled, true),
    COALESCE(p_auto_create_utm_mappings, true),
    COALESCE(p_require_manual_approval, false),
    COALESCE(p_auto_confidence_threshold, 'medium'),
    NOW()
  )
  ON CONFLICT (account_id)
  DO UPDATE SET
    auto_attribution_enabled = COALESCE(p_auto_attribution_enabled, account_attribution_settings.auto_attribution_enabled),
    auto_create_utm_mappings = COALESCE(p_auto_create_utm_mappings, account_attribution_settings.auto_create_utm_mappings),
    require_manual_approval = COALESCE(p_require_manual_approval, account_attribution_settings.require_manual_approval),
    auto_confidence_threshold = COALESCE(p_auto_confidence_threshold, account_attribution_settings.auto_confidence_threshold),
    updated_at = NOW();
    
  RETURN jsonb_build_object(
    'status', 'updated',
    'account_id', p_account_id
  );
END;
$$;

-- 9. Add helpful comments and indexes
COMMENT ON TABLE account_attribution_settings IS 'Per-account settings for automatic UTM attribution behavior';
COMMENT ON FUNCTION auto_classify_and_create_mapping IS 'Automatically classifies and optionally creates UTM mappings based on account settings';
COMMENT ON FUNCTION get_pending_attribution_mappings IS 'Returns auto-created mappings pending manual approval';
COMMENT ON FUNCTION manage_auto_mapping IS 'Approve, reject, or modify auto-created attribution mappings';
COMMENT ON FUNCTION update_attribution_settings IS 'Update account-level attribution automation settings';

CREATE INDEX IF NOT EXISTS idx_utm_mappings_status ON utm_attribution_mappings(account_id, mapping_status, auto_created);
CREATE INDEX IF NOT EXISTS idx_attribution_settings_account ON account_attribution_settings(account_id); 