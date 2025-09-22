-- Add local date columns to meta_ad_performance table for metrics filtering
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS local_date DATE;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS local_week DATE;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS local_month DATE;

-- Add local date columns to meta_campaigns table
ALTER TABLE meta_campaigns ADD COLUMN IF NOT EXISTS local_date DATE;
ALTER TABLE meta_campaigns ADD COLUMN IF NOT EXISTS local_week DATE;
ALTER TABLE meta_campaigns ADD COLUMN IF NOT EXISTS local_month DATE;

-- Add local date columns to meta_ad_sets table
ALTER TABLE meta_ad_sets ADD COLUMN IF NOT EXISTS local_date DATE;
ALTER TABLE meta_ad_sets ADD COLUMN IF NOT EXISTS local_week DATE;
ALTER TABLE meta_ad_sets ADD COLUMN IF NOT EXISTS local_month DATE;

-- Add local date columns to meta_ads table
ALTER TABLE meta_ads ADD COLUMN IF NOT EXISTS local_date DATE;
ALTER TABLE meta_ads ADD COLUMN IF NOT EXISTS local_week DATE;
ALTER TABLE meta_ads ADD COLUMN IF NOT EXISTS local_month DATE;

-- Create function to calculate local dates for Meta performance data
CREATE OR REPLACE FUNCTION calculate_meta_performance_local_dates()
RETURNS TRIGGER AS $$
DECLARE
    account_timezone TEXT;
BEGIN
    -- Get account timezone
    SELECT business_timezone INTO account_timezone
    FROM accounts 
    WHERE id = NEW.account_id;
    
    -- Default to UTC if no timezone set
    IF account_timezone IS NULL THEN
        account_timezone := 'UTC';
    END IF;
    
    -- Calculate local dates based on date_start in account timezone
    NEW.local_date := (NEW.date_start AT TIME ZONE 'UTC' AT TIME ZONE account_timezone)::DATE;
    NEW.local_week := date_trunc('week', (NEW.date_start AT TIME ZONE 'UTC' AT TIME ZONE account_timezone)::DATE)::DATE;
    NEW.local_month := date_trunc('month', (NEW.date_start AT TIME ZONE 'UTC' AT TIME ZONE account_timezone)::DATE)::DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for meta_ad_performance
DROP TRIGGER IF EXISTS trigger_meta_performance_local_dates ON meta_ad_performance;
CREATE TRIGGER trigger_meta_performance_local_dates
    BEFORE INSERT OR UPDATE ON meta_ad_performance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_meta_performance_local_dates();

-- Create function to calculate local dates for Meta campaigns
CREATE OR REPLACE FUNCTION calculate_meta_campaigns_local_dates()
RETURNS TRIGGER AS $$
DECLARE
    account_timezone TEXT;
BEGIN
    -- Get account timezone
    SELECT business_timezone INTO account_timezone
    FROM accounts 
    WHERE id = NEW.account_id;
    
    -- Default to UTC if no timezone set
    IF account_timezone IS NULL THEN
        account_timezone := 'UTC';
    END IF;
    
    -- Calculate local dates based on created_at in account timezone
    NEW.local_date := (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE account_timezone)::DATE;
    NEW.local_week := date_trunc('week', (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE account_timezone)::DATE)::DATE;
    NEW.local_month := date_trunc('month', (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE account_timezone)::DATE)::DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for meta_campaigns
DROP TRIGGER IF EXISTS trigger_meta_campaigns_local_dates ON meta_campaigns;
CREATE TRIGGER trigger_meta_campaigns_local_dates
    BEFORE INSERT OR UPDATE ON meta_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION calculate_meta_campaigns_local_dates();

-- Backfill local dates for existing records
UPDATE meta_ad_performance 
SET 
    local_date = date_start,
    local_week = date_trunc('week', date_start)::DATE,
    local_month = date_trunc('month', date_start)::DATE
WHERE local_date IS NULL;

UPDATE meta_campaigns 
SET 
    local_date = created_at::DATE,
    local_week = date_trunc('week', created_at::DATE)::DATE,
    local_month = date_trunc('month', created_at::DATE)::DATE
WHERE local_date IS NULL;

-- Add indexes for performance on local date columns
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_local_date ON meta_ad_performance(local_date);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_local_week ON meta_ad_performance(local_week);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_local_month ON meta_ad_performance(local_month);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_local_date ON meta_campaigns(local_date);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_local_week ON meta_campaigns(local_week);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_local_month ON meta_campaigns(local_month);

-- Add comments
COMMENT ON COLUMN meta_ad_performance.local_date IS 'Local date based on account timezone for metrics filtering';
COMMENT ON COLUMN meta_ad_performance.local_week IS 'Local week (Monday start) based on account timezone for metrics filtering';
COMMENT ON COLUMN meta_ad_performance.local_month IS 'Local month based on account timezone for metrics filtering'; 