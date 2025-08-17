-- Add booked flags and appointment linkage to dials
ALTER TABLE dials ADD COLUMN IF NOT EXISTS booked BOOLEAN DEFAULT false;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS booked_appointment_id UUID REFERENCES appointments(id);

CREATE INDEX IF NOT EXISTS idx_dials_booked ON dials(booked);
CREATE INDEX IF NOT EXISTS idx_dials_booked_appointment_id ON dials(booked_appointment_id); 