-- Add unique constraints for appointment/discovery upsert operations
-- This allows us to use onConflict for upserting based on GHL appointment ID

-- Add unique constraint to appointments table
CREATE UNIQUE INDEX IF NOT EXISTS appointments_account_ghl_appointment_unique 
ON appointments(account_id, ghl_appointment_id);

COMMENT ON INDEX appointments_account_ghl_appointment_unique IS 
'Ensures one appointment per account per GHL appointment ID - enables upsert on webhook';

-- Add unique constraint to discoveries table
CREATE UNIQUE INDEX IF NOT EXISTS discoveries_account_ghl_appointment_unique 
ON discoveries(account_id, ghl_appointment_id);

COMMENT ON INDEX discoveries_account_ghl_appointment_unique IS 
'Ensures one discovery per account per GHL appointment ID - enables upsert on webhook';

