-- Add Meta Ads connection fields to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_user_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_refresh_token TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_auth_type TEXT DEFAULT 'oauth2' CHECK (meta_auth_type IN ('oauth2'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_token_health_status TEXT DEFAULT 'healthy' CHECK (meta_token_health_status IN ('healthy', 'warning', 'expired', 'needs_reauth'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_token_last_refreshed TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_meta_user_id ON accounts(meta_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_meta_token_health ON accounts(meta_token_health_status);

-- Add comments for documentation
COMMENT ON COLUMN accounts.meta_access_token IS 'Meta Ads API access token (OAuth access token)';
COMMENT ON COLUMN accounts.meta_user_id IS 'Meta user ID for API calls';
COMMENT ON COLUMN accounts.meta_refresh_token IS 'OAuth 2.0 refresh token for Meta Ads API access';
COMMENT ON COLUMN accounts.meta_auth_type IS 'Authentication type: oauth2';
COMMENT ON COLUMN accounts.meta_token_expires_at IS 'When the OAuth access token expires';
COMMENT ON COLUMN accounts.meta_token_health_status IS 'Token health status for monitoring';
COMMENT ON COLUMN accounts.meta_token_last_refreshed IS 'When the token was last refreshed'; 