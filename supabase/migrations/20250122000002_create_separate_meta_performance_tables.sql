-- Create separate performance tables for each Meta Ads level
-- This provides clean separation and avoids unique constraint conflicts

-- Campaign Performance Table
CREATE TABLE IF NOT EXISTS meta_campaign_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_campaign_id UUID NOT NULL REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Performance metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  
  -- Action data
  actions JSONB,
  action_values JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(account_id, meta_campaign_id, date)
);

-- Ad Set Performance Table  
CREATE TABLE IF NOT EXISTS meta_adset_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_ad_set_id UUID NOT NULL REFERENCES meta_ad_sets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Performance metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  
  -- Action data
  actions JSONB,
  action_values JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(account_id, meta_ad_set_id, date)
);

-- Ad Performance Table
CREATE TABLE IF NOT EXISTS meta_ad_performance_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_ad_id UUID NOT NULL REFERENCES meta_ads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Performance metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  
  -- Action data
  actions JSONB,
  action_values JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(account_id, meta_ad_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_campaign_performance_account_date ON meta_campaign_performance(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_campaign_performance_spend ON meta_campaign_performance(account_id, spend DESC, date DESC);

CREATE INDEX IF NOT EXISTS idx_meta_adset_performance_account_date ON meta_adset_performance(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_adset_performance_spend ON meta_adset_performance(account_id, spend DESC, date DESC);

CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_daily_account_date ON meta_ad_performance_daily(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_daily_spend ON meta_ad_performance_daily(account_id, spend DESC, date DESC);

-- Enable RLS on all tables
ALTER TABLE meta_campaign_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_adset_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_performance_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Campaign Performance
CREATE POLICY "Users can view campaign performance for their accounts" ON meta_campaign_performance
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can manage campaign performance for their accounts" ON meta_campaign_performance
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('moderator')
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for Ad Set Performance
CREATE POLICY "Users can view adset performance for their accounts" ON meta_adset_performance
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can manage adset performance for their accounts" ON meta_adset_performance
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('moderator')
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for Ad Performance
CREATE POLICY "Users can view ad performance for their accounts" ON meta_ad_performance_daily
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can manage ad performance for their accounts" ON meta_ad_performance_daily
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM account_access 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('moderator')
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE meta_campaign_performance IS 'Daily performance metrics for Meta Ads campaigns';
COMMENT ON TABLE meta_adset_performance IS 'Daily performance metrics for Meta Ads ad sets';
COMMENT ON TABLE meta_ad_performance_daily IS 'Daily performance metrics for individual Meta Ads'; 