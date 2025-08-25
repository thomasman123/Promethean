-- Debug dial-appointment linking for August 21st specifically
-- Let's see what's preventing the links

DO $$
DECLARE
    debug_info RECORD;
BEGIN
    RAISE NOTICE 'Debugging dial-appointment linking for August 21st...';
    
    -- Check appointments on Aug 21st
    FOR debug_info IN
        SELECT 
            a.id,
            a.date_booked,
            a.date_booked_for,
            a.contact_id,
            CASE WHEN d_linked.id IS NOT NULL THEN 'HAS_DIAL_LINK' ELSE 'NO_DIAL_LINK' END as link_status
        FROM appointments a
        LEFT JOIN dials d_linked ON d_linked.booked_appointment_id = a.id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
        ORDER BY a.date_booked
        LIMIT 5
    LOOP
        RAISE NOTICE 'Appointment %: booked=%, booked_for=%, contact_id=%, status=%', 
            debug_info.id, debug_info.date_booked, debug_info.date_booked_for, 
            debug_info.contact_id, debug_info.link_status;
    END LOOP;
    
    -- Check dials on Aug 21st
    FOR debug_info IN
        SELECT 
            d.id,
            d.date_called,
            d.contact_id,
            d.booked,
            d.booked_appointment_id
        FROM dials d
        WHERE d.date_called >= '2025-08-21'::date 
          AND d.date_called < '2025-08-22'::date
        ORDER BY d.date_called
        LIMIT 5
    LOOP
        RAISE NOTICE 'Dial %: called=%, contact_id=%, booked=%, linked_to=%', 
            debug_info.id, debug_info.date_called, debug_info.contact_id, 
            debug_info.booked, debug_info.booked_appointment_id;
    END LOOP;
    
    -- Look for potential matches with wider windows
    DECLARE
        match_30min INTEGER := 0;
        match_1hr INTEGER := 0; 
        match_2hr INTEGER := 0;
        match_same_day INTEGER := 0;
    BEGIN
        -- 30 minute window
        SELECT COUNT(*) INTO match_30min
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND a.contact_id IS NOT NULL
          AND d.contact_id IS NOT NULL
          AND d.booked = false
          AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 30 * 60;
          
        -- 1 hour window  
        SELECT COUNT(*) INTO match_1hr
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND a.contact_id IS NOT NULL
          AND d.contact_id IS NOT NULL
          AND d.booked = false
          AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 60 * 60;
          
        -- 2 hour window
        SELECT COUNT(*) INTO match_2hr
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND a.contact_id IS NOT NULL
          AND d.contact_id IS NOT NULL
          AND d.booked = false
          AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 2 * 60 * 60;
          
        -- Same day (any time difference)
        SELECT COUNT(*) INTO match_same_day
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND d.date_called >= '2025-08-21'::date 
          AND d.date_called < '2025-08-22'::date
          AND a.contact_id IS NOT NULL
          AND d.contact_id IS NOT NULL
          AND d.booked = false;
          
        RAISE NOTICE 'Potential matches for Aug 21st:';
        RAISE NOTICE '  - 30 minute window: %', match_30min;
        RAISE NOTICE '  - 1 hour window: %', match_1hr;
        RAISE NOTICE '  - 2 hour window: %', match_2hr;
        RAISE NOTICE '  - Same day (any time): %', match_same_day;
    END;
    
    -- Show one specific example if available
    DECLARE
        example_appt_id UUID;
        example_dial_id UUID;
        time_diff_minutes NUMERIC;
    BEGIN
        SELECT a.id, d.id, EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60
        INTO example_appt_id, example_dial_id, time_diff_minutes
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND a.contact_id IS NOT NULL
          AND d.contact_id IS NOT NULL
          AND d.booked = false
          AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 2 * 60 * 60
        ORDER BY ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called)))
        LIMIT 1;
        
        IF example_appt_id IS NOT NULL THEN
            RAISE NOTICE 'Example linkable pair: appointment=%, dial=%, time_diff=% minutes', 
                example_appt_id, example_dial_id, ROUND(time_diff_minutes, 1);
        ELSE
            RAISE NOTICE 'No linkable pairs found in 2-hour window for Aug 21st';
        END IF;
    END;

END $$; 