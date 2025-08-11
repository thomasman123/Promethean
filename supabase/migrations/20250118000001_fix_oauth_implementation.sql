-- Fix OAuth implementation to match working version
-- Add OAuth 2.0 fields to accounts table (like the working implementation)

-- First, add the missing OAuth fields to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS ghl_refresh_token text,
ADD COLUMN IF NOT EXISTS ghl_auth_type text DEFAULT 'api_key' CHECK (ghl_auth_type IN ('api_key', 'oauth2')),
ADD COLUMN IF NOT EXISTS ghl_token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ghl_webhook_id text,
ADD COLUMN IF NOT EXISTS future_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS future_sync_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_future_sync_at TIMESTAMPTZ;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_ghl_auth_type ON accounts(ghl_auth_type);
CREATE INDEX IF NOT EXISTS idx_accounts_ghl_location_id ON accounts(ghl_location_id);

-- Add comments for documentation
COMMENT ON COLUMN accounts.ghl_refresh_token IS 'OAuth 2.0 refresh token for GHL API access';
COMMENT ON COLUMN accounts.ghl_auth_type IS 'Authentication type: api_key or oauth2';
COMMENT ON COLUMN accounts.ghl_token_expires_at IS 'When the OAuth access token expires';
COMMENT ON COLUMN accounts.ghl_webhook_id IS 'ID of the webhook subscription in GHL';
COMMENT ON COLUMN accounts.future_sync_enabled IS 'Whether automatic future appointment sync is enabled for this account';
COMMENT ON COLUMN accounts.future_sync_started_at IS 'When future sync was first enabled for this account';
COMMENT ON COLUMN accounts.last_future_sync_at IS 'Timestamp of the last successful future sync run';

-- Enable future sync for all existing accounts
UPDATE accounts SET future_sync_enabled = true WHERE future_sync_enabled IS NULL OR future_sync_enabled = false;

-- The ghl_connections table is still useful for calendar mappings but not for storing primary OAuth credentials
-- Keep it but update the purpose
COMMENT ON TABLE ghl_connections IS 'Secondary GHL connection details for calendar mappings and additional features'; 