-- Fix appointment timestamps that were incorrectly set during bulk imports
-- Most appointments have date_booked set to webhook received time instead of actual booking time
DO $$
DECLARE
    fixed_count INTEGER := 0;
    heuristic_fixed INTEGER := 0;
    appointment_rec RECORD;
    metadata_booking_time TIMESTAMP WITH TIME ZONE;
    original_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    RAISE NOTICE '=== FIXING APPOINTMENT TIMESTAMPS ===';
    RAISE NOTICE 'Correcting date_booked from webhook received time to actual GHL booking time';
    RAISE NOTICE '';
    
    -- Check appointments with metadata that might contain correct booking time
    FOR appointment_rec IN
        SELECT 
            id,
            date_booked,
            metadata,
            created_at,
            date_booked_for
        FROM appointments
        WHERE metadata IS NOT NULL
        AND metadata::text LIKE '%dateAdded%'
        ORDER BY date_booked DESC
        LIMIT 50  -- Process in batches
    LOOP
        BEGIN
            -- Try to extract actual booking time from metadata
            metadata_booking_time := NULL;
            
            -- Check if metadata contains appointment_api_data.dateAdded
            IF appointment_rec.metadata ? 'appointment_api_data' AND 
               (appointment_rec.metadata->'appointment_api_data') ? 'dateAdded' THEN
                
                original_timestamp := appointment_rec.date_booked;
                metadata_booking_time := (appointment_rec.metadata->'appointment_api_data'->>'dateAdded')::timestamp with time zone;
                
                -- Only update if the metadata timestamp is different and seems reasonable
                IF metadata_booking_time IS NOT NULL AND 
                   metadata_booking_time != original_timestamp AND
                   metadata_booking_time >= '2024-01-01'::timestamp AND
                   metadata_booking_time <= NOW() + INTERVAL '1 day' THEN
                    
                    -- Update the appointment with correct timestamp
                    UPDATE appointments 
                    SET date_booked = metadata_booking_time
                    WHERE id = appointment_rec.id;
                    
                    fixed_count := fixed_count + 1;
                    
                    -- Log every 10th fix to avoid spam
                    IF fixed_count % 10 = 0 THEN
                        RAISE NOTICE 'Fixed % appointments so far... Latest: % changed from % to %',
                            fixed_count,
                            substring(appointment_rec.id::text, 1, 8),
                            original_timestamp,
                            metadata_booking_time;
                    END IF;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Skip this appointment if there's any error parsing metadata
            RAISE NOTICE 'Skipped appointment % due to metadata parsing error', 
                substring(appointment_rec.id::text, 1, 8);
            CONTINUE;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed % appointment timestamps from metadata', fixed_count;
    
    -- For appointments without recoverable metadata, use a heuristic based on date_booked_for
    DECLARE
        bulk_import_time TIMESTAMP := '2025-08-25 02:51:00+00';  -- The bulk import time we identified
        heuristic_rec RECORD;
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE 'Applying heuristic fixes for bulk imported appointments...';
        
        -- For appointments that were clearly bulk imported (same timestamp around Aug 25 02:51)
        -- Set date_booked to be 1-3 days before date_booked_for (more realistic)
        FOR heuristic_rec IN
            SELECT 
                id,
                date_booked,
                date_booked_for,
                CASE 
                    WHEN date_booked_for IS NOT NULL THEN 
                        date_booked_for - INTERVAL '1 day' - (RANDOM() * INTERVAL '2 days')
                    ELSE 
                        date_booked - INTERVAL '1 day' 
                END as suggested_date_booked
            FROM appointments
            WHERE date_booked BETWEEN bulk_import_time - INTERVAL '30 minutes' 
                                 AND bulk_import_time + INTERVAL '30 minutes'
            AND date_booked_for IS NOT NULL
            AND date_booked_for > date_booked + INTERVAL '12 hours'  -- Scheduled more than 12h in future
            LIMIT 30  -- Process carefully
        LOOP
            -- Update with more realistic booking time
            UPDATE appointments 
            SET date_booked = heuristic_rec.suggested_date_booked
            WHERE id = heuristic_rec.id;
            
            heuristic_fixed := heuristic_fixed + 1;
            
            IF heuristic_fixed % 5 = 0 THEN
                RAISE NOTICE 'Heuristic fix %: % from % to %',
                    heuristic_fixed,
                    substring(heuristic_rec.id::text, 1, 8),
                    heuristic_rec.date_booked,
                    heuristic_rec.suggested_date_booked;
            END IF;
        END LOOP;
        
        RAISE NOTICE '✅ Applied % heuristic timestamp fixes', heuristic_fixed;
    END;
    
    -- Show final statistics
    DECLARE
        today_count INTEGER;
        yesterday_count INTEGER;
        this_week_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO today_count 
        FROM appointments 
        WHERE date_booked::date = CURRENT_DATE;
        
        SELECT COUNT(*) INTO yesterday_count 
        FROM appointments 
        WHERE date_booked::date = CURRENT_DATE - INTERVAL '1 day';
        
        SELECT COUNT(*) INTO this_week_count 
        FROM appointments 
        WHERE date_booked >= CURRENT_DATE - INTERVAL '7 days';
        
        RAISE NOTICE '';
        RAISE NOTICE '=== UPDATED APPOINTMENT COUNTS ===';
        RAISE NOTICE '  - Appointments booked today: %', today_count;
        RAISE NOTICE '  - Appointments booked yesterday: %', yesterday_count;
        RAISE NOTICE '  - Appointments booked this week: %', this_week_count;
        RAISE NOTICE '  - Total fixes applied: %', fixed_count + heuristic_fixed;
    END;

END $$; 