-- Comprehensive backfill for dial-appointment linking with 30-minute window
-- This addresses the issue where the previous backfill didn't link enough appointments

DO $$
DECLARE
    before_booked_count INTEGER;
    after_booked_count INTEGER;
    linked_count INTEGER;
BEGIN
    -- Get count of booked dials before
    SELECT COUNT(*) INTO before_booked_count FROM dials WHERE booked = true;
    
    RAISE NOTICE 'Starting comprehensive dial-appointment backfill...';
    RAISE NOTICE 'Booked dials before: %', before_booked_count;

    -- Main backfill: Find appointments and link to closest dials within 30-minute window
    WITH appointment_dial_matches AS (
        SELECT DISTINCT ON (a.id)
            a.id as appointment_id,
            a.date_booked as appointment_time,
            a.contact_id,
            d.id as dial_id,
            d.date_called as dial_time,
            ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked))) as seconds_diff
        FROM appointments a
        INNER JOIN dials d ON (
            d.account_id = a.account_id 
            AND d.contact_id = a.contact_id
            AND d.contact_id IS NOT NULL
            AND a.contact_id IS NOT NULL
            AND d.booked = false  -- Only link unbooked dials
            AND d.date_called >= (a.date_booked - INTERVAL '30 minutes')
            AND d.date_called <= (a.date_booked + INTERVAL '30 minutes')
        )
        WHERE a.contact_id IS NOT NULL
        ORDER BY a.id, ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked)))  -- Closest dial to appointment time
    )
    UPDATE dials 
    SET 
        booked = true,
        booked_appointment_id = appointment_dial_matches.appointment_id
    FROM appointment_dial_matches
    WHERE dials.id = appointment_dial_matches.dial_id;

    -- Get updated count and calculate difference
    SELECT COUNT(*) INTO after_booked_count FROM dials WHERE booked = true;
    linked_count := after_booked_count - before_booked_count;
    
    RAISE NOTICE 'Backfill complete!';
    RAISE NOTICE 'Booked dials after: %', after_booked_count;
    RAISE NOTICE 'New appointments linked: %', linked_count;

    -- Special analysis for August 21-25, 2024
    DECLARE
        aug_appointments INTEGER;
        aug_dials INTEGER;
        aug_booked_dials INTEGER;
    BEGIN
        SELECT 
            COUNT(DISTINCT CASE WHEN a.date_booked >= '2024-08-21' AND a.date_booked < '2024-08-26' THEN a.id END),
            COUNT(DISTINCT CASE WHEN d.date_called >= '2024-08-21' AND d.date_called < '2024-08-26' THEN d.id END),
            COUNT(DISTINCT CASE WHEN d.date_called >= '2024-08-21' AND d.date_called < '2024-08-26' AND d.booked = true THEN d.id END)
        INTO aug_appointments, aug_dials, aug_booked_dials
        FROM appointments a
        FULL OUTER JOIN dials d ON d.account_id = a.account_id;
        
        RAISE NOTICE 'August 21-25 Analysis:';
        RAISE NOTICE '  - Appointments in period: %', aug_appointments;
        RAISE NOTICE '  - Dials in period: %', aug_dials;  
        RAISE NOTICE '  - Booked dials in period: %', aug_booked_dials;
    END;

END $$;

-- Create a function for future manual backfills if needed
CREATE OR REPLACE FUNCTION backfill_dial_appointment_links(
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_window_minutes INTEGER DEFAULT 30
) RETURNS TABLE (
    appointments_processed INTEGER,
    dials_linked INTEGER
) AS $$
DECLARE
    processed_count INTEGER := 0;
    linked_count INTEGER := 0;
BEGIN
    WITH appointment_dial_matches AS (
        SELECT DISTINCT ON (a.id)
            a.id as appointment_id,
            d.id as dial_id
        FROM appointments a
        INNER JOIN dials d ON (
            d.account_id = a.account_id 
            AND d.contact_id = a.contact_id
            AND d.contact_id IS NOT NULL
            AND a.contact_id IS NOT NULL
            AND d.booked = false
            AND d.date_called >= (a.date_booked - (p_window_minutes || ' minutes')::INTERVAL)
            AND d.date_called <= (a.date_booked + (p_window_minutes || ' minutes')::INTERVAL)
        )
        WHERE a.contact_id IS NOT NULL
          AND (p_start_date IS NULL OR a.date_booked >= p_start_date)
          AND (p_end_date IS NULL OR a.date_booked <= p_end_date)
        ORDER BY a.id, ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked)))
    )
    UPDATE dials 
    SET 
        booked = true,
        booked_appointment_id = appointment_dial_matches.appointment_id
    FROM appointment_dial_matches
    WHERE dials.id = appointment_dial_matches.dial_id;
    
    GET DIAGNOSTICS linked_count = ROW_COUNT;
    
    SELECT COUNT(DISTINCT a.id) INTO processed_count
    FROM appointments a
    WHERE a.contact_id IS NOT NULL
      AND (p_start_date IS NULL OR a.date_booked >= p_start_date)
      AND (p_end_date IS NULL OR a.date_booked <= p_end_date);
    
    RETURN QUERY SELECT processed_count, linked_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION backfill_dial_appointment_links(TIMESTAMP, TIMESTAMP, INTEGER) IS 'Backfill dial-appointment links for a specific date range with configurable time window'; 