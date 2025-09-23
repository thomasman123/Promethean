-- Fix incorrect dial-appointment linking
-- Remove links where:
-- 1. Appointment was booked BEFORE the dial (negative time difference)
-- 2. Appointment was booked more than 30 minutes AFTER the dial

BEGIN;

-- First, let's see what we're dealing with
CREATE TEMP TABLE incorrect_links AS
SELECT 
  d.id as dial_id,
  d.booked_appointment_id,
  d.date_called,
  d.setter,
  d.duration,
  a.date_booked as appointment_date,
  EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60 as minutes_diff
FROM dials d
JOIN appointments a ON d.booked_appointment_id = a.id
WHERE d.booked = true
  AND d.booked_appointment_id IS NOT NULL
  AND (
    -- Appointment booked BEFORE the dial (negative time)
    a.date_booked < d.date_called
    OR
    -- Appointment booked more than 30 minutes AFTER the dial
    a.date_booked > d.date_called + INTERVAL '30 minutes'
  );

-- Log what we're about to fix
DO $$
DECLARE
    incorrect_count INTEGER;
    negative_time_count INTEGER;
    too_long_gap_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO incorrect_count FROM incorrect_links;
    
    SELECT COUNT(*) INTO negative_time_count 
    FROM incorrect_links 
    WHERE minutes_diff < 0;
    
    SELECT COUNT(*) INTO too_long_gap_count 
    FROM incorrect_links 
    WHERE minutes_diff > 30;
    
    RAISE NOTICE 'Found % incorrectly linked dials:', incorrect_count;
    RAISE NOTICE '- % with appointments BEFORE dial (negative time)', negative_time_count;
    RAISE NOTICE '- % with appointments more than 30 minutes after dial', too_long_gap_count;
END $$;

-- Unlink the incorrectly linked dials
UPDATE dials 
SET 
  booked = false,
  booked_appointment_id = NULL,
  updated_at = NOW()
WHERE id IN (SELECT dial_id FROM incorrect_links);

-- Log the results
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % incorrectly linked dials', fixed_count;
END $$;

-- Clean up temp table
DROP TABLE incorrect_links;

COMMIT;

-- Add a comment for future reference
COMMENT ON TABLE dials IS 'Dial-appointment linking fixed on 2025-09-23: Only appointments booked within 30 minutes AFTER the dial time are linked. Flow: Dial → (up to 30 min) → Appointment booking. This naturally filters for quality conversations without requiring specific duration thresholds.'; 