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

-- Create meta_ad_accounts table for client-specific ad account mapping
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    meta_ad_account_id TEXT NOT NULL,
    meta_ad_account_name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(account_id, meta_ad_account_id)
);

-- Add RLS policies for meta_ad_accounts
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own account's Meta ad accounts
CREATE POLICY "Users can view their account's Meta ad accounts" ON meta_ad_accounts
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

-- Allow moderators and admins to manage Meta ad accounts
CREATE POLICY "Moderators can manage Meta ad accounts" ON meta_ad_accounts
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

-- Add indexes for meta_ad_accounts performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_account_id ON meta_ad_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_meta_ad_account_id ON meta_ad_accounts(meta_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_is_active ON meta_ad_accounts(is_active);

-- Add comments for meta_ad_accounts table
COMMENT ON TABLE meta_ad_accounts IS 'Maps Meta Ad Accounts to specific client accounts for granular access control';
COMMENT ON COLUMN meta_ad_accounts.account_id IS 'Reference to the client account in our system';
COMMENT ON COLUMN meta_ad_accounts.meta_ad_account_id IS 'Meta Ad Account ID from Facebook API';
COMMENT ON COLUMN meta_ad_accounts.meta_ad_account_name IS 'Display name of the Meta Ad Account';
COMMENT ON COLUMN meta_ad_accounts.is_active IS 'Whether this ad account mapping is active for the client'; 