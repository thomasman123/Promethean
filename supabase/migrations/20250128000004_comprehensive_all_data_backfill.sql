-- Comprehensive backfill for ALL dial-appointment linking across entire database
-- This links ALL appointments to their originating dials using contact_id matching

DO $$
DECLARE
    before_booked_count INTEGER;
    after_booked_count INTEGER;
    linked_count INTEGER;
    total_appointments INTEGER;
    total_dials INTEGER;
    appointments_with_contact_id INTEGER;
    dials_with_contact_id INTEGER;
BEGIN
    -- Get comprehensive stats before backfill
    SELECT COUNT(*) INTO before_booked_count FROM dials WHERE booked = true;
    SELECT COUNT(*) INTO total_appointments FROM appointments;
    SELECT COUNT(*) INTO total_dials FROM dials;
    SELECT COUNT(*) INTO appointments_with_contact_id FROM appointments WHERE contact_id IS NOT NULL;
    SELECT COUNT(*) INTO dials_with_contact_id FROM dials WHERE contact_id IS NOT NULL;
    
    RAISE NOTICE 'Starting COMPREHENSIVE dial-appointment backfill for ALL data...';
    RAISE NOTICE 'Before backfill stats:';
    RAISE NOTICE '  - Total appointments: %', total_appointments;
    RAISE NOTICE '  - Appointments with contact_id: %', appointments_with_contact_id;
    RAISE NOTICE '  - Total dials: %', total_dials;
    RAISE NOTICE '  - Dials with contact_id: %', dials_with_contact_id;
    RAISE NOTICE '  - Currently booked dials: %', before_booked_count;

    -- Main backfill: Link ALL appointments to their closest dials within 30-minute window
    WITH appointment_dial_matches AS (
        SELECT DISTINCT ON (a.id)
            a.id as appointment_id,
            a.date_booked as appointment_time,
            a.contact_id,
            d.id as dial_id,
            d.date_called as dial_time,
            ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked))) as seconds_diff,
            EXTRACT(EPOCH FROM (d.date_called - a.date_booked))/60 as minutes_diff
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
    ),
    update_results AS (
        UPDATE dials 
        SET 
            booked = true,
            booked_appointment_id = appointment_dial_matches.appointment_id
        FROM appointment_dial_matches
        WHERE dials.id = appointment_dial_matches.dial_id
        RETURNING 
            dials.id as dial_id,
            appointment_dial_matches.appointment_id,
            appointment_dial_matches.appointment_time,
            appointment_dial_matches.dial_time,
            appointment_dial_matches.minutes_diff
    )
    SELECT COUNT(*) INTO linked_count FROM update_results;

    -- Get updated count
    SELECT COUNT(*) INTO after_booked_count FROM dials WHERE booked = true;
    
    RAISE NOTICE 'COMPREHENSIVE backfill complete!';
    RAISE NOTICE 'Results:';
    RAISE NOTICE '  - Booked dials before: %', before_booked_count;
    RAISE NOTICE '  - Booked dials after: %', after_booked_count;
    RAISE NOTICE '  - New appointments linked: %', linked_count;
    RAISE NOTICE '  - Success rate: %.1f%% of linkable appointments', 
        CASE WHEN appointments_with_contact_id > 0 
             THEN (linked_count::FLOAT / appointments_with_contact_id::FLOAT) * 100 
             ELSE 0 END;

    -- Show some sample successful links for verification
    DECLARE
        sample_links RECORD;
        sample_count INTEGER := 0;
    BEGIN
        RAISE NOTICE 'Sample successful links (showing up to 5):';
        FOR sample_links IN
            SELECT 
                a.id as appointment_id,
                a.date_booked,
                d.id as dial_id,  
                d.date_called,
                ROUND(EXTRACT(EPOCH FROM (d.date_called - a.date_booked))/60, 1) as minutes_between
            FROM appointments a
            INNER JOIN dials d ON d.booked_appointment_id = a.id
            WHERE d.booked = true
            ORDER BY a.date_booked DESC
            LIMIT 5
        LOOP
            sample_count := sample_count + 1;
            RAISE NOTICE '  %. Appointment % at % linked to Dial % at % (% minutes apart)', 
                sample_count,
                sample_links.appointment_id, 
                sample_links.date_booked,
                sample_links.dial_id,
                sample_links.date_called,
                sample_links.minutes_between;
        END LOOP;
        
        IF sample_count = 0 THEN
            RAISE NOTICE '  - No successful links found to display';
        END IF;
    END;

    -- Show date range analysis
    DECLARE
        earliest_appointment DATE;
        latest_appointment DATE;
        earliest_dial DATE;
        latest_dial DATE;
    BEGIN
        SELECT MIN(date_booked::date), MAX(date_booked::date) 
        INTO earliest_appointment, latest_appointment 
        FROM appointments WHERE contact_id IS NOT NULL;
        
        SELECT MIN(date_called::date), MAX(date_called::date) 
        INTO earliest_dial, latest_dial 
        FROM dials WHERE contact_id IS NOT NULL;
        
        RAISE NOTICE 'Data range analysis:';
        RAISE NOTICE '  - Appointments date range: % to %', earliest_appointment, latest_appointment;
        RAISE NOTICE '  - Dials date range: % to %', earliest_dial, latest_dial;
    END;

    -- Check specific periods
    DECLARE
        aug_2025_appointments INTEGER;
        aug_2025_dials INTEGER;
        aug_2025_booked_dials INTEGER;
        jan_2025_appointments INTEGER;
        jan_2025_dials INTEGER;
        jan_2025_booked_dials INTEGER;
    BEGIN
        -- August 2025 analysis
        SELECT 
            COUNT(DISTINCT CASE WHEN a.date_booked >= '2025-08-01' AND a.date_booked < '2025-09-01' THEN a.id END),
            COUNT(DISTINCT CASE WHEN d.date_called >= '2025-08-01' AND d.date_called < '2025-09-01' THEN d.id END),
            COUNT(DISTINCT CASE WHEN d.date_called >= '2025-08-01' AND d.date_called < '2025-09-01' AND d.booked = true THEN d.id END)
        INTO aug_2025_appointments, aug_2025_dials, aug_2025_booked_dials
        FROM appointments a
        FULL OUTER JOIN dials d ON d.account_id = a.account_id;
        
        -- January 2025 analysis  
        SELECT 
            COUNT(DISTINCT CASE WHEN a.date_booked >= '2025-01-01' AND a.date_booked < '2025-02-01' THEN a.id END),
            COUNT(DISTINCT CASE WHEN d.date_called >= '2025-01-01' AND d.date_called < '2025-02-01' THEN d.id END),
            COUNT(DISTINCT CASE WHEN d.date_called >= '2025-01-01' AND d.date_called < '2025-02-01' AND d.booked = true THEN d.id END)
        INTO jan_2025_appointments, jan_2025_dials, jan_2025_booked_dials
        FROM appointments a
        FULL OUTER JOIN dials d ON d.account_id = a.account_id;
        
        RAISE NOTICE 'Period-specific analysis:';
        RAISE NOTICE 'August 2025:';
        RAISE NOTICE '  - Appointments: %, Dials: %, Booked dials: %', aug_2025_appointments, aug_2025_dials, aug_2025_booked_dials;
        RAISE NOTICE 'January 2025:';
        RAISE NOTICE '  - Appointments: %, Dials: %, Booked dials: %', jan_2025_appointments, jan_2025_dials, jan_2025_booked_dials;
    END;

END $$;

-- Note: View creation removed due to ROUND function compatibility issues 