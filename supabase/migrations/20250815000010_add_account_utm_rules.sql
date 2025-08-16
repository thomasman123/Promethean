-- Add account-specific UTM interpretation rules
-- This allows each account to define what their UTM parameters mean

-- 1. Create table for account-specific UTM interpretation rules
CREATE TABLE account_utm_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL, -- e.g., "Facebook Ads Rule", "Google Ads Rule"
  utm_source_pattern TEXT, -- e.g., "fb", "ig", "google" (can be exact match or pattern)
  utm_medium_pattern TEXT, -- e.g., "ppc", "cpc", "social" (can be exact match or pattern)
  utm_campaign_pattern TEXT, -- Optional campaign pattern matching
  source_category TEXT NOT NULL, -- What business category this maps to
  specific_source TEXT NOT NULL, -- Specific source name
  description TEXT, -- User-friendly description
  priority INTEGER DEFAULT 100, -- Higher number = higher priority for overlapping rules
  is_pattern_match BOOLEAN DEFAULT false, -- Whether to use LIKE pattern matching or exact match
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, rule_name)
);

-- 2. Add RLS policies
ALTER TABLE account_utm_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_utm_rules_access ON account_utm_rules
  USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'moderator')
      AND is_active = true
    )
  );

-- 3. Create function to match UTM data against account rules
CREATE OR REPLACE FUNCTION match_utm_against_rules(
  p_account_id UUID,
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_utm_campaign TEXT DEFAULT NULL
)
RETURNS TABLE(
  source_category TEXT,
  specific_source TEXT,
  description TEXT,
  rule_name TEXT,
  confidence_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aur.source_category,
    aur.specific_source,
    aur.description,
    aur.rule_name,
    aur.priority as confidence_score
  FROM account_utm_rules aur
  WHERE aur.account_id = p_account_id
    AND aur.is_active = true
    AND (
      -- UTM Source matching
      (aur.utm_source_pattern IS NULL) OR
      (aur.is_pattern_match = false AND LOWER(COALESCE(p_utm_source, '')) = LOWER(aur.utm_source_pattern)) OR
      (aur.is_pattern_match = true AND LOWER(COALESCE(p_utm_source, '')) LIKE LOWER(aur.utm_source_pattern))
    )
    AND (
      -- UTM Medium matching  
      (aur.utm_medium_pattern IS NULL) OR
      (aur.is_pattern_match = false AND LOWER(COALESCE(p_utm_medium, '')) = LOWER(aur.utm_medium_pattern)) OR
      (aur.is_pattern_match = true AND LOWER(COALESCE(p_utm_medium, '')) LIKE LOWER(aur.utm_medium_pattern))
    )
    AND (
      -- UTM Campaign matching (optional)
      (aur.utm_campaign_pattern IS NULL) OR
      (aur.is_pattern_match = false AND LOWER(COALESCE(p_utm_campaign, '')) = LOWER(aur.utm_campaign_pattern)) OR
      (aur.is_pattern_match = true AND LOWER(COALESCE(p_utm_campaign, '')) LIKE LOWER(aur.utm_campaign_pattern))
    )
  ORDER BY aur.priority DESC, aur.created_at ASC
  LIMIT 1; -- Return the highest priority match
END;
$$ LANGUAGE plpgsql;

-- 4. Update the classify_utm_attribution function to use account rules first
CREATE OR REPLACE FUNCTION classify_utm_attribution(
  p_account_id UUID,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_session_source TEXT DEFAULT NULL,
  p_contact_source TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  rule_match RECORD;
BEGIN
  -- First, try to match against account-specific rules
  SELECT * INTO rule_match 
  FROM match_utm_against_rules(p_account_id, p_utm_source, p_utm_medium, p_utm_campaign);
  
  IF FOUND THEN
    -- Use account-specific rule
    result := jsonb_build_object(
      'source_category', rule_match.source_category,
      'specific_source', rule_match.specific_source,
      'description', rule_match.description,
      'classification_method', 'account_rule',
      'rule_name', rule_match.rule_name,
      'confidence_level', 'high',
      'utm_source', p_utm_source,
      'utm_medium', p_utm_medium,
      'utm_campaign', p_utm_campaign
    );
  ELSE
    -- Fall back to default/generic classification
    result := jsonb_build_object(
      'source_category', 'Unclassified',
      'specific_source', COALESCE(p_utm_source || ' (' || p_utm_medium || ')', p_session_source, p_contact_source, 'Unknown'),
      'description', 'UTM combination not yet classified for this account',
      'classification_method', 'fallback',
      'confidence_level', 'low',
      'utm_source', p_utm_source,
      'utm_medium', p_utm_medium,
      'utm_campaign', p_utm_campaign
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get account UTM rules
CREATE OR REPLACE FUNCTION get_account_utm_rules(p_account_id UUID)
RETURNS TABLE(
  id UUID,
  rule_name TEXT,
  utm_source_pattern TEXT,
  utm_medium_pattern TEXT,
  utm_campaign_pattern TEXT,
  source_category TEXT,
  specific_source TEXT,
  description TEXT,
  priority INTEGER,
  is_pattern_match BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aur.id,
    aur.rule_name,
    aur.utm_source_pattern,
    aur.utm_medium_pattern,
    aur.utm_campaign_pattern,
    aur.source_category,
    aur.specific_source,
    aur.description,
    aur.priority,
    aur.is_pattern_match,
    aur.is_active,
    aur.created_at,
    aur.updated_at
  FROM account_utm_rules aur
  WHERE aur.account_id = p_account_id
  ORDER BY aur.priority DESC, aur.rule_name ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to test UTM rules against sample data
CREATE OR REPLACE FUNCTION test_utm_rule_coverage(p_account_id UUID)
RETURNS TABLE(
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  usage_count BIGINT,
  matched_rule TEXT,
  proposed_category TEXT,
  proposed_source TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH utm_data AS (
    SELECT 
      COALESCE(a.utm_source, d.utm_source) as utm_source,
      COALESCE(a.utm_medium, d.utm_medium) as utm_medium,
      COALESCE(a.utm_campaign, d.utm_campaign) as utm_campaign,
      COUNT(*) as usage_count
    FROM appointments a
    FULL OUTER JOIN discoveries d ON d.account_id = a.account_id
    WHERE COALESCE(a.account_id, d.account_id) = p_account_id
      AND (a.utm_source IS NOT NULL OR a.utm_medium IS NOT NULL OR d.utm_source IS NOT NULL OR d.utm_medium IS NOT NULL)
    GROUP BY 1, 2, 3
  )
  SELECT 
    ud.utm_source,
    ud.utm_medium,
    ud.utm_campaign,
    ud.usage_count,
    mr.rule_name as matched_rule,
    mr.source_category as proposed_category,
    mr.specific_source as proposed_source
  FROM utm_data ud
  LEFT JOIN LATERAL (
    SELECT * FROM match_utm_against_rules(p_account_id, ud.utm_source, ud.utm_medium, ud.utm_campaign)
  ) mr ON true
  ORDER BY ud.usage_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Add indexes for performance
CREATE INDEX idx_account_utm_rules_account_priority ON account_utm_rules(account_id, priority DESC);
CREATE INDEX idx_account_utm_rules_patterns ON account_utm_rules(account_id, utm_source_pattern, utm_medium_pattern) WHERE is_active = true;

-- 8. Add some example categories for common patterns (these can be customized per account)
INSERT INTO source_categories (name, display_name, description) VALUES
  ('paid_social', 'Paid Social', 'Paid advertising on social media platforms'),
  ('paid_search', 'Paid Search', 'Paid search engine advertising'),
  ('organic_social', 'Organic Social', 'Organic social media traffic'),
  ('email_marketing', 'Email Marketing', 'Email campaign traffic'),
  ('direct_traffic', 'Direct Traffic', 'Direct website visits')
ON CONFLICT (name) DO NOTHING;

-- 9. Add comments
COMMENT ON TABLE account_utm_rules IS 'Account-specific rules for interpreting UTM parameters';
COMMENT ON FUNCTION match_utm_against_rules IS 'Matches UTM data against account-specific interpretation rules';
COMMENT ON FUNCTION classify_utm_attribution(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Updated to use account-specific UTM rules before falling back to defaults';
COMMENT ON FUNCTION test_utm_rule_coverage IS 'Tests how well current UTM rules cover the accounts actual UTM data'; 