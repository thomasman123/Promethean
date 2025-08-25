-- Fix Douglas Gardner's dial-appointment linking with expanded 48-hour window
DO $$
DECLARE
    douglas_contact_id UUID;
    appt_rec RECORD;
    dial_rec RECORD;
    linked_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== FIXING DOUGLAS GARDNER DIAL-APPOINTMENT LINKING ===';
    
    -- Get Douglas Gardner's contact ID
    SELECT id INTO douglas_contact_id FROM contacts WHERE email = 'dougelectric7@gmail.com';
    RAISE NOTICE 'Douglas Gardner contact ID: %', douglas_contact_id;
    
    -- For each appointment, find the most recent unbooked dial within 48 hours before booking
    FOR appt_rec IN
        SELECT id, date_booked, date_booked_for
        FROM appointments 
        WHERE contact_id = douglas_contact_id
        ORDER BY date_booked ASC
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE 'Processing appointment % booked at %', 
            substring(appt_rec.id::text, 1, 8), appt_rec.date_booked;
        
        -- Look for dials within 48 hours before booking
        SELECT id, date_called INTO dial_rec
        FROM dials
        WHERE contact_id = douglas_contact_id
        AND booked = false
        AND date_called >= (appt_rec.date_booked - INTERVAL '48 hours')
        AND date_called <= (appt_rec.date_booked + INTERVAL '2 hours')
        ORDER BY date_called DESC  -- Most recent first
        LIMIT 1;
        
        IF dial_rec.id IS NOT NULL THEN
            -- Link the dial to the appointment
            UPDATE dials 
            SET booked = true, booked_appointment_id = appt_rec.id
            WHERE id = dial_rec.id;
            
            linked_count := linked_count + 1;
            
            RAISE NOTICE '🔗 Linked dial % (called %) to appointment % (booked %)',
                substring(dial_rec.id::text, 1, 8),
                dial_rec.date_called,
                substring(appt_rec.id::text, 1, 8),
                appt_rec.date_booked;
        ELSE
            RAISE NOTICE '❌ No matching dial found for appointment %', substring(appt_rec.id::text, 1, 8);
        END IF;
        
        -- Clear dial_rec for next iteration
        dial_rec := NULL;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Successfully linked % appointments to dials for Douglas Gardner', linked_count;
    
END $$; 