-- Verify the results of the user data backfill
DO $$
BEGIN
    RAISE NOTICE '=== USER DATA BACKFILL VERIFICATION ===';
    
    DECLARE
        total_appointments INTEGER;
        null_sales_reps INTEGER;
        weird_setters INTEGER;
        complete_appointments INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_appointments FROM appointments;
        
        SELECT COUNT(*) INTO null_sales_reps 
        FROM appointments 
        WHERE sales_rep IS NULL OR sales_rep = '';
        
        SELECT COUNT(*) INTO weird_setters
        FROM appointments 
        WHERE setter LIKE 'User %';
        
        SELECT COUNT(*) INTO complete_appointments
        FROM appointments 
        WHERE sales_rep IS NOT NULL AND sales_rep != ''
        AND setter IS NOT NULL AND setter != ''
        AND setter NOT LIKE 'User %';
        
        RAISE NOTICE 'Final Data Quality Results:';
        RAISE NOTICE '  - Total appointments: %', total_appointments;
        RAISE NOTICE '  - Appointments with null/empty sales_rep: % (% percent)',
            null_sales_reps, ROUND((null_sales_reps::decimal / total_appointments * 100), 1);
        RAISE NOTICE '  - Appointments with weird setters (User X): % (% percent)',
            weird_setters, ROUND((weird_setters::decimal / total_appointments * 100), 1);
        RAISE NOTICE '  - Complete appointments (good data): % (% percent)',
            complete_appointments, ROUND((complete_appointments::decimal / total_appointments * 100), 1);
    END;
    
    -- Show sample of improved appointments
    RAISE NOTICE '';
    RAISE NOTICE 'Sample of properly formatted appointments:';
    
    DECLARE
        sample_rec RECORD;
        counter INTEGER := 0;
    BEGIN
        FOR sample_rec IN
            SELECT 
                substring(id::text, 1, 8) as short_id,
                setter,
                sales_rep,
                date_booked::date as booked_date
            FROM appointments 
            WHERE sales_rep IS NOT NULL AND sales_rep != ''
            AND setter IS NOT NULL AND setter != ''
            AND setter NOT LIKE 'User %'
            ORDER BY date_booked DESC
            LIMIT 8
        LOOP
            counter := counter + 1;
            RAISE NOTICE '% | ID: % | Setter: "%" | Sales Rep: "%" | Date: %',
                counter,
                sample_rec.short_id,
                sample_rec.setter,
                sample_rec.sales_rep,
                sample_rec.booked_date;
        END LOOP;
    END;
    
    -- Show any remaining problematic appointments
    RAISE NOTICE '';
    RAISE NOTICE 'Remaining problematic appointments (if any):';
    
    DECLARE
        problem_rec RECORD;
        problem_counter INTEGER := 0;
    BEGIN
        FOR problem_rec IN
            SELECT 
                substring(id::text, 1, 8) as short_id,
                setter,
                sales_rep,
                date_booked::date as booked_date
            FROM appointments 
            WHERE (sales_rep IS NULL OR sales_rep = '' OR setter LIKE 'User %')
            ORDER BY date_booked DESC
            LIMIT 5
        LOOP
            problem_counter := problem_counter + 1;
            RAISE NOTICE '% | ID: % | Setter: "%" | Sales Rep: "%" | Date: %',
                problem_counter,
                problem_rec.short_id,
                COALESCE(problem_rec.setter, 'NULL'),
                COALESCE(problem_rec.sales_rep, 'NULL'),
                problem_rec.booked_date;
        END LOOP;
        
        IF problem_counter = 0 THEN
            RAISE NOTICE '🎉 NO PROBLEMATIC APPOINTMENTS REMAINING!';
        END IF;
    END;

END $$; 