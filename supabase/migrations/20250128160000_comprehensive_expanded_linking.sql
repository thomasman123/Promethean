-- Comprehensive dial-appointment linking backfill with expanded 48-hour window
-- This will link appointments to dials for ALL accounts using the new timing logic

DO $$
DECLARE
    total_linked INTEGER := 0;
    account_rec RECORD;
    appt_rec RECORD;
    dial_rec RECORD;
    account_linked INTEGER;
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE DIAL-APPOINTMENT LINKING WITH 48-HOUR WINDOW ===';
    RAISE NOTICE 'Linking appointments to dials where appointment was booked within 48 hours of a dial';
    RAISE NOTICE '';
    
    -- Process each account
    FOR account_rec IN
        SELECT id, name FROM accounts ORDER BY name
    LOOP
        account_linked := 0;
        RAISE NOTICE 'Processing account: % (%)', account_rec.name, substring(account_rec.id::text, 1, 8);
        
        -- For each unlinked appointment in this account
        FOR appt_rec IN
            SELECT a.id, a.contact_id, a.date_booked, a.date_booked_for
            FROM appointments a
            WHERE a.account_id = account_rec.id
            AND NOT EXISTS (
                SELECT 1 FROM dials d 
                WHERE d.booked_appointment_id = a.id
            )
            ORDER BY a.date_booked ASC
        LOOP
            -- Look for the most recent unbooked dial within 48 hours before booking
            SELECT d.id, d.date_called INTO dial_rec
            FROM dials d
            WHERE d.account_id = account_rec.id
            AND d.contact_id = appt_rec.contact_id
            AND d.booked = false
            AND d.date_called >= (appt_rec.date_booked - INTERVAL '48 hours')
            AND d.date_called <= (appt_rec.date_booked + INTERVAL '2 hours')
            ORDER BY d.date_called DESC  -- Most recent first
            LIMIT 1;
            
            IF dial_rec.id IS NOT NULL THEN
                -- Link the dial to the appointment
                UPDATE dials 
                SET booked = true, booked_appointment_id = appt_rec.id
                WHERE id = dial_rec.id;
                
                account_linked := account_linked + 1;
                total_linked := total_linked + 1;
                
                -- Log every 10th link to avoid spam
                IF total_linked % 10 = 0 THEN
                    RAISE NOTICE '  Linked dial % to appointment % (% total so far)',
                        substring(dial_rec.id::text, 1, 8),
                        substring(appt_rec.id::text, 1, 8),
                        total_linked;
                END IF;
            END IF;
            
            -- Clear dial_rec for next iteration
            dial_rec := NULL;
        END LOOP;
        
        IF account_linked > 0 THEN
            RAISE NOTICE '  ✅ Account %: linked % appointments', account_rec.name, account_linked;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL RESULTS ===';
    RAISE NOTICE '✅ Total appointments linked to dials: %', total_linked;
    
    -- Show summary statistics
    RAISE NOTICE '';
    RAISE NOTICE 'Updated statistics:';
    
    DECLARE
        total_appointments INTEGER;
        total_dials INTEGER;
        linked_dials INTEGER;
        unlinked_appointments INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_appointments FROM appointments;
        SELECT COUNT(*) INTO total_dials FROM dials;
        SELECT COUNT(*) INTO linked_dials FROM dials WHERE booked = true;
        SELECT COUNT(*) INTO unlinked_appointments 
        FROM appointments a 
        WHERE NOT EXISTS (SELECT 1 FROM dials d WHERE d.booked_appointment_id = a.id);
        
        RAISE NOTICE '  - Total appointments in system: %', total_appointments;
        RAISE NOTICE '  - Total dials in system: %', total_dials;
        RAISE NOTICE '  - Dials marked as booked: %', linked_dials;
        RAISE NOTICE '  - Appointments still unlinked: %', unlinked_appointments;
        RAISE NOTICE '  - Link success rate: % percent (%/%)', 
            ROUND((linked_dials::decimal / total_appointments * 100), 1),
            linked_dials, total_appointments;
    END;
    
END $$; 