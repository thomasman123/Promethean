-- Add account_id to dials to associate rows with an account
ALTER TABLE dials ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);
CREATE INDEX IF NOT EXISTS idx_dials_account_id ON dials(account_id); 