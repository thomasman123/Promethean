-- URGENT: Debug dashboard metrics vs actual Slack bookings
DO $$
BEGIN
    RAISE NOTICE '=== URGENT DASHBOARD METRICS DEBUG ===';
    RAISE NOTICE 'Investigating discrepancy between Slack notifications and dashboard metrics';
    
    -- Check recent appointments in database
    RAISE NOTICE '';
    RAISE NOTICE '1. RECENT APPOINTMENTS IN DATABASE:';
    
    DECLARE
        recent_rec RECORD;
        recent_counter INTEGER := 0;
        today_count INTEGER := 0;
        yesterday_count INTEGER := 0;
    BEGIN
        -- Show all appointments from the last 3 days
        FOR recent_rec IN
            SELECT 
                substring(a.id::text, 1, 8) as short_id,
                a.setter,
                a.sales_rep,
                a.date_booked,
                a.date_booked_for,
                c.name as contact_name,
                c.email,
                c.phone,
                acc.name as account_name
            FROM appointments a
            LEFT JOIN contacts c ON c.id = a.contact_id
            LEFT JOIN accounts acc ON acc.id = a.account_id
            WHERE a.date_booked >= NOW() - INTERVAL '3 days'
            ORDER BY a.date_booked DESC
            LIMIT 20
        LOOP
            recent_counter := recent_counter + 1;
            
            -- Count today's appointments
            IF recent_rec.date_booked::date = CURRENT_DATE THEN
                today_count := today_count + 1;
            END IF;
            
            -- Count yesterday's appointments  
            IF recent_rec.date_booked::date = CURRENT_DATE - INTERVAL '1 day' THEN
                yesterday_count := yesterday_count + 1;
            END IF;
            
            RAISE NOTICE '% | % | Booked: % | For: % | Contact: % | Email: % | Account: %',
                recent_counter,
                recent_rec.short_id,
                recent_rec.date_booked,
                recent_rec.date_booked_for,
                COALESCE(recent_rec.contact_name, 'NULL'),
                COALESCE(recent_rec.email, 'NULL'),
                COALESCE(recent_rec.account_name, 'NULL');
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE 'APPOINTMENT COUNTS:';
        RAISE NOTICE '  - Total recent appointments (3 days): %', recent_counter;
        RAISE NOTICE '  - Today (%): %', CURRENT_DATE, today_count;
        RAISE NOTICE '  - Yesterday (%): %', CURRENT_DATE - INTERVAL '1 day', yesterday_count;
    END;
    
    -- Check specific contacts from Slack notifications
    RAISE NOTICE '';
    RAISE NOTICE '2. CHECKING SPECIFIC SLACK CONTACTS:';
    
    DECLARE
        contact_emails TEXT[] := ARRAY[
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
        ];
        slack_email TEXT;
        contact_found RECORD;
        found_count INTEGER := 0;
    BEGIN
        FOREACH slack_email IN ARRAY contact_emails
        LOOP
            -- Check if contact exists and has recent appointments
            SELECT 
                c.id as contact_id,
                c.name as contact_name,
                c.email,
                COUNT(a.id) as appointment_count,
                MAX(a.date_booked) as latest_appointment
            INTO contact_found
            FROM contacts c
            LEFT JOIN appointments a ON a.contact_id = c.id AND a.date_booked >= NOW() - INTERVAL '2 days'
            WHERE c.email = slack_email
            GROUP BY c.id, c.name, c.email;
            
            IF contact_found.contact_id IS NOT NULL THEN
                found_count := found_count + 1;
                RAISE NOTICE '✅ % | % | Recent appointments: % | Latest: %',
                    slack_email,
                    COALESCE(contact_found.contact_name, 'NULL'),
                    contact_found.appointment_count,
                    COALESCE(contact_found.latest_appointment::text, 'NONE');
            ELSE
                RAISE NOTICE '❌ % | NOT FOUND IN DATABASE', slack_email;
            END IF;
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE 'SLACK CONTACT VERIFICATION:';
        RAISE NOTICE '  - Slack emails checked: %', array_length(contact_emails, 1);
        RAISE NOTICE '  - Found in database: %', found_count;
        RAISE NOTICE '  - Missing from database: %', array_length(contact_emails, 1) - found_count;
    END;
    
    -- Check dial-appointment linking for recent bookings
    RAISE NOTICE '';
    RAISE NOTICE '3. DIAL-APPOINTMENT LINKING STATUS:';
    
    DECLARE
        linking_rec RECORD;
        linked_count INTEGER := 0;
        unlinked_count INTEGER := 0;
        total_recent INTEGER := 0;
    BEGIN
        FOR linking_rec IN
            SELECT 
                a.id as appt_id,
                a.date_booked,
                c.name as contact_name,
                c.email,
                d.id as dial_id,
                d.date_called,
                d.booked as dial_linked
            FROM appointments a
            LEFT JOIN contacts c ON c.id = a.contact_id
            LEFT JOIN dials d ON d.booked_appointment_id = a.id
            WHERE a.date_booked >= NOW() - INTERVAL '2 days'
            ORDER BY a.date_booked DESC
            LIMIT 15
        LOOP
            total_recent := total_recent + 1;
            
            IF linking_rec.dial_linked = true THEN
                linked_count := linked_count + 1;
                RAISE NOTICE '🔗 % | % | Linked to dial % (called %)',
                    substring(linking_rec.appt_id::text, 1, 8),
                    COALESCE(linking_rec.contact_name, 'NULL'),
                    COALESCE(substring(linking_rec.dial_id::text, 1, 8), 'NULL'),
                    COALESCE(linking_rec.date_called::text, 'NULL');
            ELSE
                unlinked_count := unlinked_count + 1;
                RAISE NOTICE '💔 % | % | NO DIAL LINKED',
                    substring(linking_rec.appt_id::text, 1, 8),
                    COALESCE(linking_rec.contact_name, 'NULL');
            END IF;
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE 'RECENT LINKING STATUS:';
        RAISE NOTICE '  - Total recent appointments: %', total_recent;
        RAISE NOTICE '  - Linked to dials: %', linked_count;
        RAISE NOTICE '  - Not linked to dials: %', unlinked_count;
        RAISE NOTICE '  - Linking rate: % percent', 
            CASE WHEN total_recent > 0 THEN ROUND((linked_count::decimal / total_recent * 100), 1) ELSE 0 END;
    END;

END $$; 