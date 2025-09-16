-- Create Meta Ads tracking system foundation
-- This will support Facebook/Instagram ads tracking and ROI calculations

-- Meta Ad Accounts table
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_account_id TEXT NOT NULL,
    meta_ad_account_name TEXT,
    access_token_encrypted TEXT, -- For API access
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(account_id, meta_ad_account_id)
);

-- Meta Campaigns table
CREATE TABLE IF NOT EXISTS meta_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_account_id UUID NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
    meta_campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    objective TEXT, -- CONVERSIONS, TRAFFIC, etc.
    status TEXT, -- ACTIVE, PAUSED, etc.
    daily_budget DECIMAL(10,2),
    lifetime_budget DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meta_ad_account_id, meta_campaign_id)
);

-- Meta Ad Sets table
CREATE TABLE IF NOT EXISTS meta_ad_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_campaign_id UUID NOT NULL REFERENCES meta_campaigns(id) ON DELETE CASCADE,
    meta_ad_set_id TEXT NOT NULL,
    ad_set_name TEXT NOT NULL,
    status TEXT,
    daily_budget DECIMAL(10,2),
    lifetime_budget DECIMAL(10,2),
    targeting_data JSONB, -- Store targeting criteria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meta_campaign_id, meta_ad_set_id)
);

-- Meta Ads table
CREATE TABLE IF NOT EXISTS meta_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_set_id UUID NOT NULL REFERENCES meta_ad_sets(id) ON DELETE CASCADE,
    meta_ad_id TEXT NOT NULL,
    ad_name TEXT NOT NULL,
    status TEXT,
    creative_data JSONB, -- Store ad creative info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meta_ad_set_id, meta_ad_id)
);

-- Meta Ad Performance (daily stats)
CREATE TABLE IF NOT EXISTS meta_ad_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_account_id UUID NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
    meta_campaign_id UUID REFERENCES meta_campaigns(id) ON DELETE CASCADE,
    meta_ad_set_id UUID REFERENCES meta_ad_sets(id) ON DELETE CASCADE,
    meta_ad_id UUID REFERENCES meta_ads(id) ON DELETE CASCADE,
    
    -- Date for this performance data
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    
    -- Core metrics
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    reach BIGINT DEFAULT 0,
    frequency DECIMAL(10,4) DEFAULT 0,
    
    -- Conversion metrics
    actions JSONB, -- Store all action types and counts
    action_values JSONB, -- Store action values
    conversions BIGINT DEFAULT 0,
    conversion_values DECIMAL(10,2) DEFAULT 0,
    
    -- Cost metrics
    cpm DECIMAL(10,2) DEFAULT 0, -- Cost per 1000 impressions
    cpc DECIMAL(10,2) DEFAULT 0, -- Cost per click
    ctr DECIMAL(10,4) DEFAULT 0, -- Click through rate
    
    -- Custom metrics for our use case
    appointments_booked BIGINT DEFAULT 0, -- If we can track this
    cost_per_appointment DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(account_id, meta_campaign_id, meta_ad_set_id, meta_ad_id, date_start, date_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_account_id ON meta_ad_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_account_id ON meta_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_sets_account_id ON meta_ad_sets(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_account_id ON meta_ads(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_account_id ON meta_ad_performance(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_date ON meta_ad_performance(date_start, date_end);

-- RLS Policies
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_performance ENABLE ROW LEVEL SECURITY;

-- Policies for meta_ad_accounts
CREATE POLICY "Users can view meta ad accounts for their accessible accounts" ON meta_ad_accounts
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'moderator' OR role = 'sales_rep' OR role = 'setter')
        )
    );

CREATE POLICY "Admins can manage meta ad accounts" ON meta_ad_accounts
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can view meta campaigns for their accessible accounts" ON meta_campaigns
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'moderator' OR role = 'sales_rep' OR role = 'setter')
        )
    );

CREATE POLICY "Users can view meta ad sets for their accessible accounts" ON meta_ad_sets
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'moderator' OR role = 'sales_rep' OR role = 'setter')
        )
    );

CREATE POLICY "Users can view meta ads for their accessible accounts" ON meta_ads
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'moderator' OR role = 'sales_rep' OR role = 'setter')
        )
    );

CREATE POLICY "Users can view meta ad performance for their accessible accounts" ON meta_ad_performance
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'moderator' OR role = 'sales_rep' OR role = 'setter')
        )
    );

-- Admins can manage all meta tables
CREATE POLICY "Admins can manage meta campaigns" ON meta_campaigns
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage meta ad sets" ON meta_ad_sets
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage meta ads" ON meta_ads
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage meta ad performance" ON meta_ad_performance
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON meta_ad_accounts TO authenticated;
GRANT ALL ON meta_campaigns TO authenticated;
GRANT ALL ON meta_ad_sets TO authenticated;
GRANT ALL ON meta_ads TO authenticated;
GRANT ALL ON meta_ad_performance TO authenticated; 