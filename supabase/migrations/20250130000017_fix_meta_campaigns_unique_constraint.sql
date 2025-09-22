-- Fix meta_campaigns table unique constraint for upsert operations
ALTER TABLE meta_campaigns ADD CONSTRAINT meta_campaigns_account_campaign_unique 
  UNIQUE (account_id, meta_campaign_id);

-- Fix meta_ad_sets table unique constraint  
ALTER TABLE meta_ad_sets ADD CONSTRAINT meta_ad_sets_account_adset_unique 
  UNIQUE (account_id, meta_ad_set_id);

-- Fix meta_ads table unique constraint
ALTER TABLE meta_ads ADD CONSTRAINT meta_ads_account_ad_unique 
  UNIQUE (account_id, meta_ad_id);

-- Fix meta_ad_performance table unique constraint for upsert
ALTER TABLE meta_ad_performance ADD CONSTRAINT meta_ad_performance_unique 
  UNIQUE (account_id, meta_ad_account_id, date_start, date_end, meta_campaign_id);

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT meta_campaigns_account_campaign_unique ON meta_campaigns 
  IS 'Ensures one campaign per account with unique Meta campaign ID for upsert operations';

COMMENT ON CONSTRAINT meta_ad_sets_account_adset_unique ON meta_ad_sets 
  IS 'Ensures one ad set per account with unique Meta ad set ID for upsert operations';

COMMENT ON CONSTRAINT meta_ads_account_ad_unique ON meta_ads 
  IS 'Ensures one ad per account with unique Meta ad ID for upsert operations';

COMMENT ON CONSTRAINT meta_ad_performance_unique ON meta_ad_performance 
  IS 'Ensures unique performance records per account, ad account, date range, and campaign for upsert operations'; 