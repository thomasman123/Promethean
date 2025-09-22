-- Create meta_campaigns table
CREATE TABLE IF NOT EXISTS meta_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_account_id UUID REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
    meta_campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    objective TEXT,
    status TEXT,
    daily_budget NUMERIC,
    lifetime_budget NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(account_id, meta_campaign_id)
);

-- Create meta_ad_sets table
CREATE TABLE IF NOT EXISTS meta_ad_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_campaign_id UUID REFERENCES meta_campaigns(id) ON DELETE CASCADE,
    meta_ad_set_id TEXT NOT NULL,
    ad_set_name TEXT NOT NULL,
    status TEXT,
    daily_budget NUMERIC,
    lifetime_budget NUMERIC,
    targeting_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(account_id, meta_ad_set_id)
);

-- Create meta_ads table
CREATE TABLE IF NOT EXISTS meta_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_set_id UUID REFERENCES meta_ad_sets(id) ON DELETE CASCADE,
    meta_ad_id TEXT NOT NULL,
    ad_name TEXT NOT NULL,
    status TEXT,
    creative_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(account_id, meta_ad_id)
);

-- Create meta_ad_performance table for storing insights/metrics
CREATE TABLE IF NOT EXISTS meta_ad_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_account_id UUID REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
    meta_campaign_id UUID REFERENCES meta_campaigns(id) ON DELETE SET NULL,
    meta_ad_set_id UUID REFERENCES meta_ad_sets(id) ON DELETE SET NULL,
    meta_ad_id UUID REFERENCES meta_ads(id) ON DELETE SET NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend NUMERIC DEFAULT 0,
    reach BIGINT DEFAULT 0,
    frequency NUMERIC DEFAULT 0,
    actions JSONB,
    action_values JSONB,
    conversions BIGINT DEFAULT 0,
    conversion_values NUMERIC DEFAULT 0,
    cpm NUMERIC DEFAULT 0,
    cpc NUMERIC DEFAULT 0,
    ctr NUMERIC DEFAULT 0,
    appointments_booked BIGINT DEFAULT 0,
    cost_per_appointment NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for all Meta tables
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_performance ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view their account's Meta campaigns" ON meta_campaigns
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Moderators can manage Meta campaigns" ON meta_campaigns
    FOR ALL USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin') 
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Ad Sets policies
CREATE POLICY "Users can view their account's Meta ad sets" ON meta_ad_sets
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Moderators can manage Meta ad sets" ON meta_ad_sets
    FOR ALL USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin') 
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Ads policies
CREATE POLICY "Users can view their account's Meta ads" ON meta_ads
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Moderators can manage Meta ads" ON meta_ads
    FOR ALL USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin') 
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Performance data policies
CREATE POLICY "Users can view their account's Meta performance data" ON meta_ad_performance
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Moderators can manage Meta performance data" ON meta_ad_performance
    FOR ALL USING (
        account_id IN (
            SELECT account_id 
            FROM account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin') 
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_account_id ON meta_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_meta_campaign_id ON meta_campaigns(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_status ON meta_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_meta_ad_sets_account_id ON meta_ad_sets(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_sets_meta_ad_set_id ON meta_ad_sets(meta_ad_set_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_sets_meta_campaign_id ON meta_ad_sets(meta_campaign_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_account_id ON meta_ads(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_meta_ad_id ON meta_ads(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_meta_ad_set_id ON meta_ads(meta_ad_set_id);

CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_account_id ON meta_ad_performance(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_date_range ON meta_ad_performance(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_meta_campaign_id ON meta_ad_performance(meta_campaign_id);

-- Add table comments
COMMENT ON TABLE meta_campaigns IS 'Meta Ads campaigns synced from Facebook API';
COMMENT ON TABLE meta_ad_sets IS 'Meta Ads ad sets synced from Facebook API';
COMMENT ON TABLE meta_ads IS 'Meta Ads individual ads synced from Facebook API';
COMMENT ON TABLE meta_ad_performance IS 'Meta Ads performance metrics and insights data'; 