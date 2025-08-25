-- Restore dial links that were cleared by call-events webhook
-- This fixes appointments that exist but have no linked dials (causing 0 booked calls)

DO $$
DECLARE
    restored_count INTEGER := 0;
    total_unlinked INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting restoration of cleared dial links...';
    
    -- Check how many appointments exist without any linked dials
    SELECT COUNT(DISTINCT a.id) INTO total_unlinked
    FROM appointments a
    LEFT JOIN dials d ON d.booked_appointment_id = a.id
    WHERE a.contact_id IS NOT NULL 
      AND d.id IS NULL; -- No linked dials
      
    RAISE NOTICE 'Found % appointments without linked dials', total_unlinked;
    
    -- Restore dial links for appointments that lost them
    WITH appointment_dial_restoration AS (
        SELECT DISTINCT ON (a.id)
            a.id as appointment_id,
            a.date_booked,
            a.contact_id,
            d.id as dial_id,
            d.date_called,
            ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked))) as seconds_diff
        FROM appointments a
        LEFT JOIN dials existing_link ON existing_link.booked_appointment_id = a.id
        INNER JOIN dials d ON (
            d.account_id = a.account_id 
            AND d.contact_id = a.contact_id
            AND d.contact_id IS NOT NULL
            AND a.contact_id IS NOT NULL
            AND d.booked = false  -- Currently unbooked
            AND d.date_called >= (a.date_booked - INTERVAL '30 minutes')
            AND d.date_called <= (a.date_booked + INTERVAL '30 minutes')
        )
        WHERE a.contact_id IS NOT NULL
          AND existing_link.id IS NULL  -- No existing dial link
        ORDER BY a.id, ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked)))  -- Closest dial
    )
    UPDATE dials 
    SET 
        booked = true,
        booked_appointment_id = appointment_dial_restoration.appointment_id
    FROM appointment_dial_restoration
    WHERE dials.id = appointment_dial_restoration.dial_id;
    
    GET DIAGNOSTICS restored_count = ROW_COUNT;
    
    RAISE NOTICE 'Restoration complete!';
    RAISE NOTICE '  - Appointments without dial links: %', total_unlinked;
    RAISE NOTICE '  - Dial links restored: %', restored_count;
    
    -- Show August 2025 results specifically
    DECLARE
        aug_appointments INTEGER;
        aug_booked_dials INTEGER;
    BEGIN
        SELECT 
            COUNT(DISTINCT a.id),
            COUNT(DISTINCT CASE WHEN d.booked = true THEN d.id END)
        INTO aug_appointments, aug_booked_dials
        FROM appointments a
        FULL OUTER JOIN dials d ON d.account_id = a.account_id
        WHERE (a.date_booked >= '2025-08-01' AND a.date_booked < '2025-09-01')
           OR (d.date_called >= '2025-08-01' AND d.date_called < '2025-09-01');
        
        RAISE NOTICE 'August 2025 after restoration:';
        RAISE NOTICE '  - Appointments: %', aug_appointments;
        RAISE NOTICE '  - Booked dials: %', aug_booked_dials;
    END;

END $$; 