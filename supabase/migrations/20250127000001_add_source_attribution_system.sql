-- Add comprehensive source attribution system
-- This migration adds source mapping capabilities for appointments and discoveries

-- 1. Source Categories (high-level)
CREATE TABLE source_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO source_categories (name, display_name, description) VALUES
('discovery', 'Discovery Call', 'Appointments booked after discovery calls'),
('outbound_dial', 'Outbound Dial', 'Appointments from cold calling'),
('funnel', 'Marketing Funnel', 'Appointments from marketing funnels/landing pages'),
('organic', 'Organic/Direct', 'Direct bookings without attribution'),
('paid_ads', 'Paid Advertising', 'Appointments from paid ad campaigns'),
('referral', 'Referral', 'Appointments from referrals'),
('unknown', 'Unknown', 'Source could not be determined');

-- 2. GHL Source Mappings (account-specific)
CREATE TABLE ghl_source_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ghl_source VARCHAR(100) NOT NULL,
  source_category VARCHAR(50) NOT NULL REFERENCES source_categories(name),
  specific_source VARCHAR(200),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id, ghl_source)
);

-- 3. Campaign Attribution (for future Meta/paid ads integration)
CREATE TABLE campaign_attribution (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'meta', 'google', 'tiktok', etc.
  campaign_id VARCHAR(200) NOT NULL,
  campaign_name VARCHAR(200),
  ad_set_id VARCHAR(200),
  ad_set_name VARCHAR(200),
  ad_id VARCHAR(200),
  ad_name VARCHAR(200),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(200),
  utm_content VARCHAR(200),
  utm_term VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id, platform, campaign_id)
);

-- 4. Add attribution fields to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS ghl_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_category VARCHAR(50) REFERENCES source_categories(name),
ADD COLUMN IF NOT EXISTS specific_source VARCHAR(200),
ADD COLUMN IF NOT EXISTS campaign_attribution_id UUID REFERENCES campaign_attribution(id);

-- 5. Add attribution fields to discoveries
ALTER TABLE discoveries 
ADD COLUMN IF NOT EXISTS ghl_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_category VARCHAR(50) REFERENCES source_categories(name),
ADD COLUMN IF NOT EXISTS specific_source VARCHAR(200),
ADD COLUMN IF NOT EXISTS campaign_attribution_id UUID REFERENCES campaign_attribution(id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_ghl_source ON appointments(ghl_source);
CREATE INDEX IF NOT EXISTS idx_appointments_source_category ON appointments(source_category);
CREATE INDEX IF NOT EXISTS idx_appointments_specific_source ON appointments(specific_source);
CREATE INDEX IF NOT EXISTS idx_appointments_campaign_attribution ON appointments(campaign_attribution_id);

CREATE INDEX IF NOT EXISTS idx_discoveries_ghl_source ON discoveries(ghl_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_source_category ON discoveries(source_category);
CREATE INDEX IF NOT EXISTS idx_discoveries_specific_source ON discoveries(specific_source);
CREATE INDEX IF NOT EXISTS idx_discoveries_campaign_attribution ON discoveries(campaign_attribution_id);

CREATE INDEX IF NOT EXISTS idx_ghl_source_mappings_account ON ghl_source_mappings(account_id);
CREATE INDEX IF NOT EXISTS idx_ghl_source_mappings_lookup ON ghl_source_mappings(account_id, ghl_source, is_active);
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_account ON campaign_attribution(account_id);

-- 7. Function to get unmapped sources
CREATE OR REPLACE FUNCTION get_unmapped_sources(p_account_id UUID)
RETURNS TABLE(ghl_source VARCHAR(100)) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT a.ghl_source
  FROM (
    SELECT DISTINCT ghl_source FROM appointments 
    WHERE account_id = p_account_id AND ghl_source IS NOT NULL
    UNION
    SELECT DISTINCT ghl_source FROM discoveries 
    WHERE account_id = p_account_id AND ghl_source IS NOT NULL
  ) a
  LEFT JOIN ghl_source_mappings m 
    ON m.account_id = p_account_id AND m.ghl_source = a.ghl_source
  WHERE m.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Extract source from existing metadata
-- This populates the new ghl_source field from existing metadata
UPDATE appointments 
SET ghl_source = metadata->'appointment_api_data'->>'source'
WHERE metadata IS NOT NULL 
  AND metadata->'appointment_api_data'->>'source' IS NOT NULL
  AND ghl_source IS NULL;

UPDATE discoveries 
SET ghl_source = metadata->'appointment_api_data'->>'source'
WHERE metadata IS NOT NULL 
  AND metadata->'appointment_api_data'->>'source' IS NOT NULL
  AND ghl_source IS NULL;

-- 9. Create default mappings for each account based on common patterns
INSERT INTO ghl_source_mappings (account_id, ghl_source, source_category, description)
SELECT DISTINCT 
  a.account_id,
  a.ghl_source,
  CASE 
    WHEN a.ghl_source = 'manual' THEN 'discovery'
    WHEN a.ghl_source = 'calendar' THEN 'organic'
    WHEN a.ghl_source = 'funnel' THEN 'funnel'
    WHEN a.ghl_source = 'automation' THEN 'outbound_dial'
    WHEN a.ghl_source = 'api' THEN 'organic'
    ELSE 'unknown'
  END as source_category,
  'Auto-generated mapping - please review and update' as description
FROM (
  SELECT DISTINCT account_id, ghl_source FROM appointments WHERE ghl_source IS NOT NULL
  UNION
  SELECT DISTINCT account_id, ghl_source FROM discoveries WHERE ghl_source IS NOT NULL
) a
ON CONFLICT (account_id, ghl_source) DO NOTHING;

-- 10. Update existing records with source categories based on mappings
UPDATE appointments a
SET source_category = m.source_category,
    specific_source = m.specific_source
FROM ghl_source_mappings m
WHERE a.account_id = m.account_id 
  AND a.ghl_source = m.ghl_source 
  AND m.is_active = true
  AND a.source_category IS NULL;

UPDATE discoveries d
SET source_category = m.source_category,
    specific_source = m.specific_source
FROM ghl_source_mappings m
WHERE d.account_id = m.account_id 
  AND d.ghl_source = m.ghl_source 
  AND m.is_active = true
  AND d.source_category IS NULL;

-- 11. Create trigger to automatically update source category when records are inserted/updated
CREATE OR REPLACE FUNCTION update_source_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if ghl_source is not null
  IF NEW.ghl_source IS NOT NULL THEN
    -- Look up the mapping
    SELECT source_category, specific_source 
    INTO NEW.source_category, NEW.specific_source
    FROM ghl_source_mappings
    WHERE account_id = NEW.account_id 
      AND ghl_source = NEW.ghl_source 
      AND is_active = true
    LIMIT 1;
    
    -- If no mapping found, set to unknown
    IF NEW.source_category IS NULL THEN
      NEW.source_category = 'unknown';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for appointments and discoveries
CREATE TRIGGER update_appointment_source_category
BEFORE INSERT OR UPDATE OF ghl_source ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_source_category();

CREATE TRIGGER update_discovery_source_category
BEFORE INSERT OR UPDATE OF ghl_source ON discoveries
FOR EACH ROW
EXECUTE FUNCTION update_source_category();

-- 12. Create view for source attribution analytics
CREATE OR REPLACE VIEW source_attribution_summary AS
SELECT 
  a.account_id,
  a.source_category,
  a.specific_source,
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN a.show_outcome = 'won' THEN 1 END) as won_appointments,
  SUM(a.total_sales_value) as total_revenue
FROM appointments a
WHERE a.source_category IS NOT NULL
GROUP BY a.account_id, a.source_category, a.specific_source;

-- Grant permissions
GRANT SELECT ON source_categories TO authenticated;
GRANT ALL ON ghl_source_mappings TO authenticated;
GRANT ALL ON campaign_attribution TO authenticated;
GRANT SELECT ON source_attribution_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_unmapped_sources(UUID) TO authenticated;

-- Add RLS policies
ALTER TABLE ghl_source_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_attribution ENABLE ROW LEVEL SECURITY;

-- Users can only manage mappings for their account
CREATE POLICY "Users can manage their account's source mappings" ON ghl_source_mappings
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their account's campaign attribution" ON campaign_attribution
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE ghl_source_mappings IS 'Maps GHL appointment sources to business-specific categories';
COMMENT ON TABLE campaign_attribution IS 'Stores campaign attribution data for paid advertising';
COMMENT ON COLUMN appointments.ghl_source IS 'Raw source value from GoHighLevel API';
COMMENT ON COLUMN appointments.source_category IS 'Business-defined category for the source';
COMMENT ON COLUMN appointments.specific_source IS 'Specific funnel, campaign, or source detail';
COMMENT ON COLUMN discoveries.ghl_source IS 'Raw source value from GoHighLevel API';
COMMENT ON COLUMN discoveries.source_category IS 'Business-defined category for the source';
COMMENT ON COLUMN discoveries.specific_source IS 'Specific funnel, campaign, or source detail'; 