-- Add GHL creation date to contacts table for accurate lead tracking
-- This will store the actual date when the contact was created in GoHighLevel

-- Add ghl_created_at column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ghl_created_at TIMESTAMPTZ;

-- Add index for performance on date filtering
CREATE INDEX IF NOT EXISTS idx_contacts_ghl_created_at ON contacts(ghl_created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_account_ghl_created ON contacts(account_id, ghl_created_at);

-- Add local date columns for GHL creation date (for timezone-aware filtering)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ghl_local_date DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ghl_local_week DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ghl_local_month DATE;

-- Create indexes for local date columns
CREATE INDEX IF NOT EXISTS idx_contacts_ghl_local_date ON contacts(ghl_local_date);
CREATE INDEX IF NOT EXISTS idx_contacts_ghl_local_week ON contacts(ghl_local_week);
CREATE INDEX IF NOT EXISTS idx_contacts_ghl_local_month ON contacts(ghl_local_month);

-- Function to update local date columns based on ghl_created_at and account timezone
CREATE OR REPLACE FUNCTION update_contact_ghl_local_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    account_timezone TEXT;
BEGIN
    -- Get account timezone
    SELECT business_timezone INTO account_timezone
    FROM accounts 
    WHERE id = NEW.account_id;
    
    -- Set default timezone if not found
    IF account_timezone IS NULL THEN
        account_timezone := 'UTC';
    END IF;
    
    -- Update local date columns based on ghl_created_at
    IF NEW.ghl_created_at IS NOT NULL THEN
        NEW.ghl_local_date := DATE(NEW.ghl_created_at AT TIME ZONE account_timezone);
        NEW.ghl_local_week := DATE_TRUNC('week', NEW.ghl_created_at AT TIME ZONE account_timezone)::DATE;
        NEW.ghl_local_month := DATE_TRUNC('month', NEW.ghl_created_at AT TIME ZONE account_timezone)::DATE;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update local date columns
DROP TRIGGER IF EXISTS trigger_update_contact_ghl_local_dates ON contacts;
CREATE TRIGGER trigger_update_contact_ghl_local_dates
    BEFORE INSERT OR UPDATE OF ghl_created_at
    ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_ghl_local_dates();

-- Function to backfill ghl_created_at from existing data (if available in GHL API)
CREATE OR REPLACE FUNCTION backfill_contact_ghl_dates(
    p_account_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- For now, set ghl_created_at to created_at as fallback
    -- This should be replaced with actual GHL API data when webhook is updated
    UPDATE contacts 
    SET ghl_created_at = created_at,
        updated_at = NOW()
    WHERE (p_account_id IS NULL OR account_id = p_account_id)
      AND ghl_created_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_contact_ghl_local_dates() TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_contact_ghl_dates(UUID) TO authenticated;

-- Add comments
COMMENT ON COLUMN contacts.ghl_created_at IS 'Actual creation date from GoHighLevel (when lead was created in GHL)';
COMMENT ON COLUMN contacts.ghl_local_date IS 'Local date when contact was created in GHL (account timezone)';
COMMENT ON COLUMN contacts.ghl_local_week IS 'Local week when contact was created in GHL (account timezone)';
COMMENT ON COLUMN contacts.ghl_local_month IS 'Local month when contact was created in GHL (account timezone)';
COMMENT ON FUNCTION update_contact_ghl_local_dates IS 'Trigger function to update local date columns based on ghl_created_at';
COMMENT ON FUNCTION backfill_contact_ghl_dates IS 'Backfills ghl_created_at from existing data (temporary fallback)'; 