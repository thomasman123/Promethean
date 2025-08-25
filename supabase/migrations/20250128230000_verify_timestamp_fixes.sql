-- Verify the timestamp fixes and check current appointment distribution
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION: APPOINTMENT TIMESTAMP FIXES ===';
    
    -- Check current appointment distribution by day
    DECLARE
        day_rec RECORD;
        recent_counter INTEGER := 0;
    BEGIN
        RAISE NOTICE 'Recent appointment distribution by booking date:';
        RAISE NOTICE '';
        
        FOR day_rec IN
            SELECT 
                date_booked::date as booking_date,
                COUNT(*) as appointments_count,
                MIN(date_booked) as earliest_on_day,
                MAX(date_booked) as latest_on_day
            FROM appointments
            WHERE date_booked >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY date_booked::date
            ORDER BY booking_date DESC
        LOOP
            recent_counter := recent_counter + day_rec.appointments_count;
            RAISE NOTICE '% | % appointments | Earliest: % | Latest: %',
                day_rec.booking_date,
                day_rec.appointments_count,
                day_rec.earliest_on_day::time,
                day_rec.latest_on_day::time;
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE 'Total recent appointments (7 days): %', recent_counter;
    END;
    
    -- Check for Slack notification contacts specifically
    DECLARE
        slack_verification RECORD;
        found_today INTEGER := 0;
        found_yesterday INTEGER := 0;
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE 'Verifying Slack notification contacts:';
        
        -- Check for the specific emails from Slack notifications
        FOR slack_verification IN
            SELECT 
                c.email,
                c.name,
                COUNT(a.id) as recent_appointments,
                MAX(a.date_booked) as latest_booking,
                MAX(a.date_booked)::date as latest_booking_date
            FROM contacts c
            LEFT JOIN appointments a ON a.contact_id = c.id 
                AND a.date_booked >= CURRENT_DATE - INTERVAL '2 days'
            WHERE c.email IN (
                'carbon.group@outlook.com',          -- Brandon Loebert
                'coastelectricnj@gmail.com',         -- James Schulze  
                'dougelectric7@gmail.com',           -- Douglas Gardner
                'tyler.langfordems19@gmail.com',     -- Tyler Langford
                'cbombard5199@icloud.com',           -- Chris Bombard
                'chris@brightsolutionsus.com',      -- Chris McMillan
                'test@gmail.com',                    -- test Test
                'mary@kletteelectric.com',           -- Mary Klette
                'starboardelectrical@gmail.com',    -- Jason
                'hannonelectric22@gmail.com',       -- Jarrod Jrock
                'bigstateelectrical@gmail.com',     -- Cody
                'skuckuda@gmail.com',                -- Sherri K
                'eugene.o@mdatech.com.au',          -- Eugene Oelofse
                'admin@jlenergy.com.au'             -- Jack
            )
            GROUP BY c.id, c.email, c.name
            ORDER BY latest_booking DESC NULLS LAST
        LOOP
            IF slack_verification.latest_booking_date = CURRENT_DATE THEN
                found_today := found_today + 1;
            ELSIF slack_verification.latest_booking_date = CURRENT_DATE - INTERVAL '1 day' THEN
                found_yesterday := found_yesterday + 1;
            END IF;
            
            RAISE NOTICE '%: % | Recent: % | Latest: %',
                slack_verification.email,
                COALESCE(slack_verification.name, 'NULL'),
                slack_verification.recent_appointments,
                COALESCE(slack_verification.latest_booking::text, 'NONE');
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE 'Slack contacts with appointments:';
        RAISE NOTICE '  - Today: %', found_today;
        RAISE NOTICE '  - Yesterday: %', found_yesterday;
    END;
    
    -- Check dial linking status for recent appointments
    DECLARE
        linking_summary RECORD;
    BEGIN
        SELECT 
            COUNT(*) as total_recent,
            COUNT(d.id) as linked_to_dials,
            COUNT(*) - COUNT(d.id) as unlinked
        INTO linking_summary
        FROM appointments a
        LEFT JOIN dials d ON d.booked_appointment_id = a.id
        WHERE a.date_booked >= CURRENT_DATE - INTERVAL '2 days';
        
        RAISE NOTICE '';
        RAISE NOTICE 'Recent appointment dial linking:';
        RAISE NOTICE '  - Total recent appointments (2 days): %', linking_summary.total_recent;
        RAISE NOTICE '  - Linked to dials: %', linking_summary.linked_to_dials;
        RAISE NOTICE '  - Unlinked: %', linking_summary.unlinked;
        RAISE NOTICE '  - Linking rate: % percent', 
            CASE WHEN linking_summary.total_recent > 0 THEN 
                ROUND((linking_summary.linked_to_dials::decimal / linking_summary.total_recent * 100), 1) 
            ELSE 0 END;
    END;

END $$; 