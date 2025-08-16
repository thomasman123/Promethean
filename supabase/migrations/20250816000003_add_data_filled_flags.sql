-- Track whether data entry was completed
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS data_filled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS data_filled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_data_filled ON appointments(data_filled);
CREATE INDEX IF NOT EXISTS idx_discoveries_data_filled ON discoveries(data_filled); 