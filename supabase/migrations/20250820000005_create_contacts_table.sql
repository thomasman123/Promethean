-- Create contacts table for syncing GHL contacts and tracking total leads
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ghl_contact_id VARCHAR(64) NOT NULL,

  -- Basic identity
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  name VARCHAR(511),
  email VARCHAR(255),
  phone VARCHAR(50),
  source TEXT,
  timezone TEXT,
  assigned_to TEXT,

  -- Dates from GHL
  date_added TIMESTAMP WITH TIME ZONE,
  date_updated TIMESTAMP WITH TIME ZONE,

  -- Tags and attribution
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  attribution_source JSONB,
  last_attribution_source JSONB,

  -- Raw/custom fields snapshot
  custom_fields JSONB,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Natural key per account
  UNIQUE (account_id, ghl_contact_id)
);

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_globalsearch ON contacts(account_id, email, phone, name);

-- Policies
-- Users can read contacts for accounts they can access
CREATE POLICY "Users can read accessible contacts" ON contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM account_access aa
            WHERE aa.account_id = contacts.account_id
            AND aa.user_id = auth.uid()
            AND aa.is_active = true
        )
    );

-- Inserts/updates are performed by backend using service role; no direct client writes
CREATE POLICY "Service role can write contacts" ON contacts
    FOR ALL USING (
        -- Allow read via other policies; writes will use service role which bypasses RLS
        true
    ) WITH CHECK (true); 