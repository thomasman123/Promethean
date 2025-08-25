-- Debug August 21st dial-appointment linking specifically
-- Find out why Douglas Gardner and similar appointments aren't linking to dials

DO $$
DECLARE
    debug_info RECORD;
    aug21_appointments INTEGER := 0;
    aug21_dials INTEGER := 0;
    unlinked_appointments INTEGER := 0;
    available_dials INTEGER := 0;
BEGIN
    RAISE NOTICE '=== DEBUGGING AUGUST 21ST DIAL-APPOINTMENT LINKING ===';
    
    -- Count data for Aug 21st
    SELECT COUNT(*) INTO aug21_appointments 
    FROM appointments 
    WHERE date_booked >= '2025-08-21'::date AND date_booked < '2025-08-22'::date;
    
    SELECT COUNT(*) INTO aug21_dials
    FROM dials 
    WHERE date_called >= '2025-08-21'::date AND date_called < '2025-08-22'::date;
    
    SELECT COUNT(*) INTO unlinked_appointments
    FROM appointments a
    LEFT JOIN dials d ON d.booked_appointment_id = a.id
    WHERE a.date_booked >= '2025-08-21'::date 
      AND a.date_booked < '2025-08-22'::date
      AND d.id IS NULL;
      
    SELECT COUNT(*) INTO available_dials
    FROM dials 
    WHERE date_called >= '2025-08-21'::date 
      AND date_called < '2025-08-22'::date
      AND booked = false;
    
    RAISE NOTICE 'Aug 21st Data Summary:';
    RAISE NOTICE '  - Appointments: %', aug21_appointments;
    RAISE NOTICE '  - Dials: %', aug21_dials;
    RAISE NOTICE '  - Unlinked appointments: %', unlinked_appointments;
    RAISE NOTICE '  - Available (unbooked) dials: %', available_dials;
    
    -- Show sample appointments from Aug 21st
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Aug 21st appointments:';
    FOR debug_info IN
        SELECT 
            a.id,
            a.date_booked,
            a.contact_id,
            c.email,
            c.phone,
            c.name
        FROM appointments a
        LEFT JOIN contacts c ON c.id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
        ORDER BY a.date_booked
        LIMIT 3
    LOOP
        RAISE NOTICE '  Appt %: % | Contact: % (%, %)', 
            substring(debug_info.id::text, 1, 8), 
            debug_info.date_booked, 
            COALESCE(debug_info.name, 'Unknown'),
            COALESCE(debug_info.email, 'no-email'),
            COALESCE(debug_info.phone, 'no-phone');
    END LOOP;
    
    -- Show sample dials from Aug 21st
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Aug 21st dials:';
    FOR debug_info IN
        SELECT 
            d.id,
            d.date_called,
            d.contact_id,
            d.booked,
            c.email,
            c.phone,
            c.name
        FROM dials d
        LEFT JOIN contacts c ON c.id = d.contact_id
        WHERE d.date_called >= '2025-08-21'::date 
          AND d.date_called < '2025-08-22'::date
        ORDER BY d.date_called
        LIMIT 3
    LOOP
        RAISE NOTICE '  Dial %: % | Contact: % (%, %) | Booked: %', 
            substring(debug_info.id::text, 1, 8), 
            debug_info.date_called, 
            COALESCE(debug_info.name, 'Unknown'),
            COALESCE(debug_info.email, 'no-email'),
            COALESCE(debug_info.phone, 'no-phone'),
            debug_info.booked;
    END LOOP;
    
    -- Try to find potential matches with different time windows
    DECLARE
        matches_30min INTEGER := 0;
        matches_2hr INTEGER := 0;
        matches_same_day INTEGER := 0;
    BEGIN
        -- 30 minute window
        SELECT COUNT(*) INTO matches_30min
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND d.booked = false
          AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 1800; -- 30 minutes
          
        -- 2 hour window
        SELECT COUNT(*) INTO matches_2hr
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND d.booked = false
          AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 7200; -- 2 hours
          
        -- Same day (any time)
        SELECT COUNT(*) INTO matches_same_day
        FROM appointments a
        INNER JOIN dials d ON d.contact_id = a.contact_id
        WHERE a.date_booked >= '2025-08-21'::date 
          AND a.date_booked < '2025-08-22'::date
          AND d.date_called >= '2025-08-21'::date 
          AND d.date_called < '2025-08-22'::date
          AND d.booked = false;
          
        RAISE NOTICE '';
        RAISE NOTICE 'Potential matches with contact_id matching:';
        RAISE NOTICE '  - 30 minute window: %', matches_30min;
        RAISE NOTICE '  - 2 hour window: %', matches_2hr;
        RAISE NOTICE '  - Same day (any time): %', matches_same_day;
    END;
    
    -- Test if we can link ANY appointments with a 2-hour window
    DECLARE
        linked_count INTEGER := 0;
    BEGIN
        WITH linkable_pairs AS (
            SELECT DISTINCT ON (a.id)
                a.id as appointment_id,
                d.id as dial_id,
                EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60 as minutes_diff
            FROM appointments a
            INNER JOIN dials d ON d.contact_id = a.contact_id
            WHERE a.date_booked >= '2025-08-21'::date 
              AND a.date_booked < '2025-08-22'::date
              AND d.booked = false
              AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 7200 -- 2 hours
            ORDER BY a.id, ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called)))
        )
        UPDATE dials 
        SET booked = true, booked_appointment_id = linkable_pairs.appointment_id
        FROM linkable_pairs
        WHERE dials.id = linkable_pairs.dial_id;
        
        GET DIAGNOSTICS linked_count = ROW_COUNT;
        
        RAISE NOTICE '';
        RAISE NOTICE 'TEST LINKING RESULT (2-hour window): % appointments linked to dials', linked_count;
    END;

END $$; 