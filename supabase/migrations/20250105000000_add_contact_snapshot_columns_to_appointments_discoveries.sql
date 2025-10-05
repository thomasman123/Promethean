-- Add contact snapshot and attribution columns to appointments and discoveries tables
-- These columns capture contact data at the time of appointment/discovery creation for historical tracking

-- Add columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS contact_email_snapshot text,
ADD COLUMN IF NOT EXISTS contact_phone_snapshot text,
ADD COLUMN IF NOT EXISTS contact_name_snapshot text,
ADD COLUMN IF NOT EXISTS contact_attribution_source jsonb,
ADD COLUMN IF NOT EXISTS contact_last_attribution_source jsonb,
ADD COLUMN IF NOT EXISTS contact_classified_attribution text,
ADD COLUMN IF NOT EXISTS contact_enhanced_attribution text;

COMMENT ON COLUMN appointments.contact_email_snapshot IS 'Email captured at appointment creation time';
COMMENT ON COLUMN appointments.contact_phone_snapshot IS 'Phone captured at appointment creation time';
COMMENT ON COLUMN appointments.contact_name_snapshot IS 'Name captured at appointment creation time';
COMMENT ON COLUMN appointments.contact_attribution_source IS 'Attribution source data captured at appointment creation';
COMMENT ON COLUMN appointments.contact_last_attribution_source IS 'Last attribution source data captured at appointment creation';
COMMENT ON COLUMN appointments.contact_classified_attribution IS 'Classified attribution category';
COMMENT ON COLUMN appointments.contact_enhanced_attribution IS 'Enhanced attribution classification';

-- Add columns to discoveries table
ALTER TABLE discoveries
ADD COLUMN IF NOT EXISTS contact_email_snapshot text,
ADD COLUMN IF NOT EXISTS contact_phone_snapshot text,
ADD COLUMN IF NOT EXISTS contact_name_snapshot text,
ADD COLUMN IF NOT EXISTS contact_attribution_source jsonb,
ADD COLUMN IF NOT EXISTS contact_last_attribution_source jsonb,
ADD COLUMN IF NOT EXISTS contact_classified_attribution text,
ADD COLUMN IF NOT EXISTS contact_enhanced_attribution text;

COMMENT ON COLUMN discoveries.contact_email_snapshot IS 'Email captured at discovery creation time';
COMMENT ON COLUMN discoveries.contact_phone_snapshot IS 'Phone captured at discovery creation time';
COMMENT ON COLUMN discoveries.contact_name_snapshot IS 'Name captured at discovery creation time';
COMMENT ON COLUMN discoveries.contact_attribution_source IS 'Attribution source data captured at discovery creation';
COMMENT ON COLUMN discoveries.contact_last_attribution_source IS 'Last attribution source data captured at discovery creation';
COMMENT ON COLUMN discoveries.contact_classified_attribution IS 'Classified attribution category';
COMMENT ON COLUMN discoveries.contact_enhanced_attribution IS 'Enhanced attribution classification';

