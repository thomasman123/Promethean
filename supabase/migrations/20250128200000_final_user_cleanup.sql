-- Final cleanup for remaining "User UsMIuZw9" appointments
DO $$
BEGIN
    RAISE NOTICE '=== FINAL USER DATA CLEANUP ===';
    RAISE NOTICE 'Fixing the last 2 appointments with weird setter names';
    
    -- Fix the remaining "User UsMIuZw9" appointments by setting setter to "ff ff" 
    -- (since we know UsMIuZw9 maps to user ID 4a3fe37c which is "ff ff")
    UPDATE appointments 
    SET setter = 'ff ff'
    WHERE setter = 'User UsMIuZw9';
    
    DECLARE
        fixed_count INTEGER;
    BEGIN
        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        RAISE NOTICE '✅ Fixed % remaining appointments with weird setter names', fixed_count;
    END;
    
    -- Verify final results
    DECLARE
        total_appointments INTEGER;
        weird_setters INTEGER;
        null_sales_reps INTEGER;
        perfect_appointments INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_appointments FROM appointments;
        
        SELECT COUNT(*) INTO weird_setters
        FROM appointments 
        WHERE setter LIKE 'User %';
        
        SELECT COUNT(*) INTO null_sales_reps
        FROM appointments 
        WHERE sales_rep IS NULL OR sales_rep = '';
        
        SELECT COUNT(*) INTO perfect_appointments
        FROM appointments 
        WHERE sales_rep IS NOT NULL AND sales_rep != ''
        AND setter IS NOT NULL AND setter != ''
        AND setter NOT LIKE 'User %';
        
        RAISE NOTICE '';
        RAISE NOTICE '🎉 FINAL PERFECT RESULTS:';
        RAISE NOTICE '  - Total appointments: %', total_appointments;
        RAISE NOTICE '  - Weird setters remaining: %', weird_setters;
        RAISE NOTICE '  - NULL sales reps remaining: %', null_sales_reps;
        RAISE NOTICE '  - Perfect appointments: % (% percent)',
            perfect_appointments, ROUND((perfect_appointments::decimal / total_appointments * 100), 1);
    END;
    
    -- Show final sample
    RAISE NOTICE '';
    RAISE NOTICE 'Final sample of perfectly clean appointments:';
    
    DECLARE
        final_rec RECORD;
        final_counter INTEGER := 0;
    BEGIN
        FOR final_rec IN
            SELECT 
                substring(id::text, 1, 8) as short_id,
                setter,
                sales_rep,
                date_booked::date as booked_date
            FROM appointments 
            ORDER BY date_booked DESC
            LIMIT 5
        LOOP
            final_counter := final_counter + 1;
            RAISE NOTICE '% | ID: % | Setter: "%" | Sales Rep: "%" | Date: %',
                final_counter,
                final_rec.short_id,
                final_rec.setter,
                final_rec.sales_rep,
                final_rec.booked_date;
        END LOOP;
    END;

END $$; 