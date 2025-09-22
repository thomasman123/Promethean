-- Add comprehensive Meta Ads metrics to meta_ad_performance table
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_result NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_conversion NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_lead NUMERIC DEFAULT 0;

-- Purchase and ROAS metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS purchase_roas NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS purchase_value NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS purchases BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_purchase NUMERIC DEFAULT 0;

-- Video metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS video_views BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS video_views_25_percent BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS video_views_50_percent BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS video_views_75_percent BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS video_views_100_percent BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_video_view NUMERIC DEFAULT 0;

-- Engagement metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS post_engagements BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS page_engagements BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS link_clicks BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS landing_page_views BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_landing_page_view NUMERIC DEFAULT 0;

-- Lead generation metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS leads BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS lead_value NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_lead_actual NUMERIC DEFAULT 0;

-- Social metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS post_reactions BIGINT DEFAULT 0;

-- App metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS app_installs BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS cost_per_app_install NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS app_store_clicks BIGINT DEFAULT 0;

-- Attribution and quality metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS relevance_score NUMERIC DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC DEFAULT 0;

-- Advanced conversion metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS add_to_cart BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS initiate_checkout BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS add_payment_info BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS complete_registration BIGINT DEFAULT 0;

-- Messaging metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS messaging_conversations_started BIGINT DEFAULT 0;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS messaging_first_reply BIGINT DEFAULT 0;

-- Custom conversion metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS custom_conversions JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS custom_conversion_values JSONB;

-- Attribution window data
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS attribution_1d_view JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS attribution_7d_click JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS attribution_28d_click JSONB;

-- Placement and demographic breakdowns
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS placement_breakdown JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS age_breakdown JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS gender_breakdown JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS country_breakdown JSONB;

-- Device and platform metrics
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS device_breakdown JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS platform_breakdown JSONB;
ALTER TABLE meta_ad_performance ADD COLUMN IF NOT EXISTS publisher_platform JSONB;

-- Add indexes for the new metrics
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_purchase_roas ON meta_ad_performance(purchase_roas);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_cost_per_lead ON meta_ad_performance(cost_per_lead);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_video_views ON meta_ad_performance(video_views);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_leads ON meta_ad_performance(leads);

-- Add comments for documentation
COMMENT ON COLUMN meta_ad_performance.purchase_roas IS 'Return on Ad Spend for purchase conversions';
COMMENT ON COLUMN meta_ad_performance.purchase_value IS 'Total value of purchases attributed to ads';
COMMENT ON COLUMN meta_ad_performance.video_views IS 'Total video views (3+ seconds)';
COMMENT ON COLUMN meta_ad_performance.leads IS 'Total leads generated from ads';
COMMENT ON COLUMN meta_ad_performance.custom_conversions IS 'JSON array of custom conversion events and values';
COMMENT ON COLUMN meta_ad_performance.placement_breakdown IS 'Performance breakdown by ad placement (feed, stories, etc.)';
COMMENT ON COLUMN meta_ad_performance.attribution_1d_view IS 'Conversions attributed to 1-day view window';
COMMENT ON COLUMN meta_ad_performance.attribution_7d_click IS 'Conversions attributed to 7-day click window';
COMMENT ON COLUMN meta_ad_performance.attribution_28d_click IS 'Conversions attributed to 28-day click window'; 