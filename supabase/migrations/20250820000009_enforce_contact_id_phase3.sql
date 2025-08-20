-- Phase 3: Enforce contact_id for core tables (only after backfill verified)

-- Appointments
ALTER TABLE appointments ALTER COLUMN contact_id SET NOT NULL;

-- Discoveries
ALTER TABLE discoveries ALTER COLUMN contact_id SET NOT NULL;

-- Dials (allow null temporarily if you still need unmatched dials)
-- Uncomment when ready to enforce
-- ALTER TABLE dials ALTER COLUMN contact_id SET NOT NULL; 