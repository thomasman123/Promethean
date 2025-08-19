-- Phase 1: Add contact links to core tables

-- appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_id ON appointments(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_account_contact ON appointments(account_id, contact_id);

-- dials
ALTER TABLE dials ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_dials_contact_id ON dials(contact_id);
CREATE INDEX IF NOT EXISTS idx_dials_account_contact ON dials(account_id, contact_id);

-- discoveries
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_discoveries_contact_id ON discoveries(contact_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_account_contact ON discoveries(account_id, contact_id); 