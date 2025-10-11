-- Backfill appointments and discoveries with "Unknown" setter from linked dials
-- Strategy: Find dials from the same contact within 60 minutes before the appointment was booked

DO $$
DECLARE
    appointments_updated INTEGER := 0;
    discoveries_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting setter backfill from dials...';
    
    -- ========================================
    -- BACKFILL APPOINTMENTS
    -- ========================================
    RAISE NOTICE 'Backfilling appointments...';
    
    WITH unknown_appointments AS (
        SELECT 
            a.id,
            a.account_id,
            a.contact_id,
            a.date_booked,
            a.setter
        FROM appointments a
        WHERE (a.setter = 'Unknown' OR a.setter IS NULL OR a.setter = '')
          AND a.contact_id IS NOT NULL
    ),
    matched_dials AS (
        SELECT DISTINCT ON (ua.id)
            ua.id as appointment_id,
            d.setter as dial_setter,
            d.setter_user_id as dial_setter_user_id,
            d.date_called,
            EXTRACT(EPOCH FROM (ua.date_booked - d.date_called)) / 60 as minutes_diff
        FROM unknown_appointments ua
        INNER JOIN dials d ON (
            d.account_id = ua.account_id 
            AND d.contact_id = ua.contact_id
            AND d.setter IS NOT NULL
            AND d.setter != 'Unknown'
            AND d.setter != ''
            -- Find dials within 60 minutes BEFORE the appointment was booked
            AND d.date_called >= (ua.date_booked - INTERVAL '60 minutes')
            AND d.date_called <= ua.date_booked
        )
        ORDER BY ua.id, d.date_called DESC  -- Most recent dial before appointment
    )
    UPDATE appointments a
    SET 
        setter = md.dial_setter,
        setter_user_id = COALESCE(a.setter_user_id, md.dial_setter_user_id),
        updated_at = NOW()
    FROM matched_dials md
    WHERE a.id = md.appointment_id;
    
    GET DIAGNOSTICS appointments_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % appointments with setter from dials', appointments_updated;
    
    -- ========================================
    -- BACKFILL DISCOVERIES
    -- ========================================
    RAISE NOTICE 'Backfilling discoveries...';
    
    WITH unknown_discoveries AS (
        SELECT 
            d.id,
            d.account_id,
            d.contact_id,
            d.date_booked,
            d.setter
        FROM discoveries d
        WHERE (d.setter = 'Unknown' OR d.setter IS NULL OR d.setter = '')
          AND d.contact_id IS NOT NULL
    ),
    matched_dials_discoveries AS (
        SELECT DISTINCT ON (ud.id)
            ud.id as discovery_id,
            dl.setter as dial_setter,
            dl.setter_user_id as dial_setter_user_id,
            dl.date_called,
            EXTRACT(EPOCH FROM (ud.date_booked - dl.date_called)) / 60 as minutes_diff
        FROM unknown_discoveries ud
        INNER JOIN dials dl ON (
            dl.account_id = ud.account_id 
            AND dl.contact_id = ud.contact_id
            AND dl.setter IS NOT NULL
            AND dl.setter != 'Unknown'
            AND dl.setter != ''
            -- Find dials within 60 minutes BEFORE the discovery was booked
            AND dl.date_called >= (ud.date_booked - INTERVAL '60 minutes')
            AND dl.date_called <= ud.date_booked
        )
        ORDER BY ud.id, dl.date_called DESC  -- Most recent dial before discovery
    )
    UPDATE discoveries d
    SET 
        setter = md.dial_setter,
        setter_user_id = COALESCE(d.setter_user_id, md.dial_setter_user_id),
        updated_at = NOW()
    FROM matched_dials_discoveries md
    WHERE d.id = md.discovery_id;
    
    GET DIAGNOSTICS discoveries_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % discoveries with setter from dials', discoveries_updated;
    
    -- ========================================
    -- SUMMARY
    -- ========================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Setter backfill completed!';
    RAISE NOTICE 'Appointments updated: %', appointments_updated;
    RAISE NOTICE 'Discoveries updated: %', discoveries_updated;
    RAISE NOTICE 'Total updated: %', appointments_updated + discoveries_updated;
    RAISE NOTICE '========================================';
END $$;

-- Check remaining "Unknown" setters after backfill
DO $$
DECLARE
    remaining_appointments INTEGER;
    remaining_discoveries INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_appointments 
    FROM appointments 
    WHERE setter = 'Unknown' OR setter IS NULL OR setter = '';
    
    SELECT COUNT(*) INTO remaining_discoveries 
    FROM discoveries 
    WHERE setter = 'Unknown' OR setter IS NULL OR setter = '';
    
    RAISE NOTICE 'Remaining appointments with Unknown setter: %', remaining_appointments;
    RAISE NOTICE 'Remaining discoveries with Unknown setter: %', remaining_discoveries;
    
    IF remaining_appointments > 0 OR remaining_discoveries > 0 THEN
        RAISE NOTICE 'Note: Remaining records may need GHL API backfill (no matching dials found)';
    END IF;
END $$;

