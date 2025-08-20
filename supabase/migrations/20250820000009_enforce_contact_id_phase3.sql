-- Phase 3: Enforce contact_id for core tables (only after backfill verified)

-- Appointments (conditional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM appointments WHERE contact_id IS NULL) THEN
    ALTER TABLE appointments ALTER COLUMN contact_id SET NOT NULL;
    RAISE NOTICE 'Set NOT NULL on appointments.contact_id';
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on appointments.contact_id: null rows still exist';
  END IF;
END
$$;

-- Discoveries (conditional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM discoveries WHERE contact_id IS NULL) THEN
    ALTER TABLE discoveries ALTER COLUMN contact_id SET NOT NULL;
    RAISE NOTICE 'Set NOT NULL on discoveries.contact_id';
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on discoveries.contact_id: null rows still exist';
  END IF;
END
$$;

-- Dials (leave nullable for now)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM dials WHERE contact_id IS NULL) THEN
--     ALTER TABLE dials ALTER COLUMN contact_id SET NOT NULL;
--     RAISE NOTICE 'Set NOT NULL on dials.contact_id';
--   ELSE
--     RAISE NOTICE 'Skipping NOT NULL on dials.contact_id: null rows still exist';
--   END IF;
-- END
-- $$; 