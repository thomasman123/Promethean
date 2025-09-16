-- Add token health tracking columns to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS ghl_token_last_refreshed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ghl_refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ghl_token_health_status TEXT DEFAULT 'healthy' CHECK (ghl_token_health_status IN ('healthy', 'warning', 'expired', 'needs_reauth'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_token_health ON accounts(ghl_token_health_status) WHERE ghl_auth_type = 'oauth2';
CREATE INDEX IF NOT EXISTS idx_accounts_token_expires ON accounts(ghl_token_expires_at) WHERE ghl_auth_type = 'oauth2';
CREATE INDEX IF NOT EXISTS idx_accounts_last_refreshed ON accounts(ghl_token_last_refreshed) WHERE ghl_auth_type = 'oauth2';

-- Create function to automatically update token health status
CREATE OR REPLACE FUNCTION update_ghl_token_health_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update for OAuth accounts
  IF NEW.ghl_auth_type = 'oauth2' THEN
    -- Check token expiration status
    IF NEW.ghl_token_expires_at IS NULL OR NEW.ghl_api_key IS NULL THEN
      NEW.ghl_token_health_status = 'needs_reauth';
    ELSIF NEW.ghl_token_expires_at <= NOW() THEN
      NEW.ghl_token_health_status = 'expired';
    ELSIF NEW.ghl_token_expires_at <= NOW() + INTERVAL '7 days' THEN
      NEW.ghl_token_health_status = 'warning';
    ELSE
      NEW.ghl_token_health_status = 'healthy';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update health status
DROP TRIGGER IF EXISTS update_ghl_token_health_trigger ON accounts;
CREATE TRIGGER update_ghl_token_health_trigger
  BEFORE INSERT OR UPDATE OF ghl_token_expires_at, ghl_api_key, ghl_auth_type
  ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_ghl_token_health_status();

-- Update existing records with initial health status
UPDATE accounts 
SET ghl_token_health_status = CASE
  WHEN ghl_auth_type != 'oauth2' THEN 'healthy'
  WHEN ghl_token_expires_at IS NULL OR ghl_api_key IS NULL THEN 'needs_reauth'
  WHEN ghl_token_expires_at <= NOW() THEN 'expired'
  WHEN ghl_token_expires_at <= NOW() + INTERVAL '7 days' THEN 'warning'
  ELSE 'healthy'
END
WHERE ghl_auth_type = 'oauth2'; 