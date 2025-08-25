-- Analyze Douglas Gardner's exact timing to understand linking behavior
DO $$
DECLARE
    contact_rec RECORD;
    dial_rec RECORD;
    appt_rec RECORD;
BEGIN
    RAISE NOTICE '=== DOUGLAS GARDNER TIMING ANALYSIS ===';
    
    -- Get Douglas Gardner's contact info
    SELECT * INTO contact_rec FROM contacts WHERE email = 'dougelectric7@gmail.com';
    RAISE NOTICE 'Contact ID: %', contact_rec.id;
    
    -- Show all dials with precise timing
    RAISE NOTICE '';
    RAISE NOTICE 'DIALS:';
    FOR dial_rec IN
        SELECT id, date_called, booked, booked_appointment_id, contact_id
        FROM dials 
        WHERE contact_id = contact_rec.id
        ORDER BY date_called DESC
    LOOP
        RAISE NOTICE 'Dial % | Called: % | Booked: % | Linked to: %', 
            substring(dial_rec.id::text, 1, 8),
            dial_rec.date_called,
            dial_rec.booked,
            COALESCE(substring(dial_rec.booked_appointment_id::text, 1, 8), 'none');
    END LOOP;
    
    -- Show all appointments with precise timing
    RAISE NOTICE '';
    RAISE NOTICE 'APPOINTMENTS:';
    FOR appt_rec IN
        SELECT id, date_booked, date_booked_for, contact_id
        FROM appointments 
        WHERE contact_id = contact_rec.id
        ORDER BY date_booked DESC
    LOOP
        RAISE NOTICE 'Appointment % | Booked: % | For: % | Contact: %',
            substring(appt_rec.id::text, 1, 8),
            appt_rec.date_booked,
            appt_rec.date_booked_for,
            substring(appt_rec.contact_id::text, 1, 8);
    END LOOP;
    
    -- Calculate time differences between dials and booking times
    RAISE NOTICE '';
    RAISE NOTICE 'TIME DIFFERENCE ANALYSIS:';
    FOR dial_rec IN
        SELECT d.id as dial_id, d.date_called, a.id as appt_id, a.date_booked,
               EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60 as minutes_diff
        FROM dials d
        CROSS JOIN appointments a
        WHERE d.contact_id = contact_rec.id 
        AND a.contact_id = contact_rec.id
        ORDER BY d.date_called DESC, a.date_booked ASC
    LOOP
        RAISE NOTICE 'Dial % to Appointment %: % minutes apart (% hours)',
            substring(dial_rec.dial_id::text, 1, 8),
            substring(dial_rec.appt_id::text, 1, 8),
            ROUND(dial_rec.minutes_diff::numeric, 1),
            ROUND((dial_rec.minutes_diff/60)::numeric, 1);
    END LOOP;
    
    -- Show which combinations would be caught by different time windows
    RAISE NOTICE '';
    RAISE NOTICE 'LINKING WINDOW ANALYSIS:';
    FOR dial_rec IN
        SELECT d.id as dial_id, d.date_called, a.id as appt_id, a.date_booked,
               EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60 as minutes_diff,
               CASE 
                   WHEN ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60) <= 30 THEN '✅ 30min'
                   WHEN ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60) <= 60 THEN '⚠️  60min'
                   WHEN ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60) <= 1440 THEN '🔄 24hr'
                   ELSE '❌ >24hr'
               END as window_status
        FROM dials d
        CROSS JOIN appointments a
        WHERE d.contact_id = contact_rec.id 
        AND a.contact_id = contact_rec.id
        ORDER BY ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60)
    LOOP
        RAISE NOTICE '% | Dial % → Appt %: % minutes',
            dial_rec.window_status,
            substring(dial_rec.dial_id::text, 1, 8),
            substring(dial_rec.appt_id::text, 1, 8),
            ROUND(dial_rec.minutes_diff::numeric, 1);
    END LOOP;

END $$; 