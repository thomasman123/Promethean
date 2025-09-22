-- Create meta_insights table for storing Meta Ads performance metrics
-- This table stores daily insights data at campaign, ad set, and ad levels

CREATE TABLE IF NOT EXISTS meta_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Campaign level data
  campaign_id UUID REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  campaign_name TEXT,
  
  -- Ad set level data (optional - only for ad set and ad level insights)
  adset_id TEXT,
  adset_name TEXT,
  
  -- Ad level data (optional - only for ad level insights)
  ad_id TEXT,
  ad_name TEXT,
  
  -- Performance metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  
  -- Action data (JSON for conversions, etc.)
  actions JSONB,
  action_values JSONB,
  
  -- Level indicator
  level TEXT NOT NULL CHECK (level IN ('campaign', 'adset', 'ad')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(account_id, date, campaign_id, adset_id, ad_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meta_insights_account_date ON meta_insights(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_insights_campaign ON meta_insights(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_insights_level ON meta_insights(account_id, level, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_insights_spend ON meta_insights(account_id, spend DESC, date DESC);

-- Enable RLS
ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view insights for their accounts" ON meta_insights
  FOR SELECT USING (
    account_id IN (
      SELECT account_id 
      FROM account_access 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert insights for their accounts" ON meta_insights
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id 
      FROM account_access 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('moderator')
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can update insights for their accounts" ON meta_insights
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id 
      FROM account_access 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('moderator')
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON TABLE meta_insights IS 'Stores daily performance metrics from Meta Ads at campaign, ad set, and ad levels';
COMMENT ON COLUMN meta_insights.level IS 'Indicates the level of the insight: campaign, adset, or ad';
COMMENT ON COLUMN meta_insights.actions IS 'JSON array of action data (conversions, etc.) from Meta Ads API';
COMMENT ON COLUMN meta_insights.action_values IS 'JSON array of action values (conversion values) from Meta Ads API'; 