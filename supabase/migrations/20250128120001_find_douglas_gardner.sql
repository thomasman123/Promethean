-- Find Douglas Gardner specifically in the data
-- This will help verify if the Slack notification corresponds to actual database records

DO $$
DECLARE
    search_result RECORD;
    total_douglas INTEGER := 0;
    total_gardner INTEGER := 0;
    total_dougelectric INTEGER := 0;
BEGIN
    RAISE NOTICE '=== SEARCHING FOR DOUGLAS GARDNER ===';
    
    -- Search contacts table for Douglas Gardner variations
    SELECT COUNT(*) INTO total_douglas 
    FROM contacts 
    WHERE LOWER(name) LIKE '%douglas%' OR LOWER(first_name) LIKE '%douglas%';
    
    SELECT COUNT(*) INTO total_gardner 
    FROM contacts 
    WHERE LOWER(name) LIKE '%gardner%' OR LOWER(last_name) LIKE '%gardner%';
    
    SELECT COUNT(*) INTO total_dougelectric 
    FROM contacts 
    WHERE LOWER(email) LIKE '%dougelectric%';
    
    RAISE NOTICE 'Contact search results:';
    RAISE NOTICE '  - Contains "Douglas": %', total_douglas;
    RAISE NOTICE '  - Contains "Gardner": %', total_gardner;
    RAISE NOTICE '  - Email contains "dougelectric": %', total_dougelectric;
    
    -- Show any Douglas Gardner matches
    FOR search_result IN
        SELECT 
            id,
            name,
            first_name,
            last_name,
            email,
            phone,
            created_at
        FROM contacts 
        WHERE (LOWER(name) LIKE '%douglas%' AND LOWER(name) LIKE '%gardner%')
           OR (LOWER(first_name) LIKE '%douglas%' AND LOWER(last_name) LIKE '%gardner%')
           OR LOWER(email) LIKE '%dougelectric%'
        LIMIT 5
    LOOP
        RAISE NOTICE 'Found contact: % | % % | % | % | Created: %',
            substring(search_result.id::text, 1, 8),
            COALESCE(search_result.first_name, ''),
            COALESCE(search_result.last_name, ''),
            COALESCE(search_result.email, 'no-email'),
            COALESCE(search_result.phone, 'no-phone'),
            search_result.created_at;
    END LOOP;
    
    -- Search appointments for Douglas Gardner
    RAISE NOTICE '';
    RAISE NOTICE 'Searching appointments for Douglas Gardner...';
    FOR search_result IN
        SELECT 
            a.id,
            a.date_booked,
            a.date_booked_for,
            a.contact_name,
            a.setter,
            a.sales_rep,
            c.name as contact_name_from_table,
            c.email,
            c.phone
        FROM appointments a
        LEFT JOIN contacts c ON c.id = a.contact_id
        WHERE (LOWER(a.contact_name) LIKE '%douglas%' AND LOWER(a.contact_name) LIKE '%gardner%')
           OR (LOWER(c.name) LIKE '%douglas%' AND LOWER(c.name) LIKE '%gardner%')
           OR LOWER(c.email) LIKE '%dougelectric%'
        ORDER BY a.date_booked DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Found appointment: % | Booked: % | For: % | Contact: % | Email: %',
            substring(search_result.id::text, 1, 8),
            search_result.date_booked,
            search_result.date_booked_for,
            COALESCE(search_result.contact_name_from_table, search_result.contact_name),
            COALESCE(search_result.email, 'no-email');
    END LOOP;
    
    -- Search by phone number +12024206970
    RAISE NOTICE '';
    RAISE NOTICE 'Searching by phone +12024206970...';
    FOR search_result IN
        SELECT 
            'contact' as source,
            id,
            name,
            email,
            phone,
            created_at as date_created
        FROM contacts 
        WHERE phone LIKE '%2024206970%'
        UNION ALL
        SELECT 
            'appointment' as source,
            a.id,
            a.contact_name as name,
            NULL as email,
            a.phone,
            a.date_booked as date_created
        FROM appointments a
        WHERE a.phone LIKE '%2024206970%'
        UNION ALL
        SELECT 
            'dial' as source,
            d.id,
            d.contact_name as name,
            d.email,
            d.phone,
            d.date_called as date_created
        FROM dials d
        WHERE d.phone LIKE '%2024206970%'
        ORDER BY date_created DESC
        LIMIT 10
    LOOP
        RAISE NOTICE 'Found % with phone: % | % | % | %',
            search_result.source,
            substring(search_result.id::text, 1, 8),
            COALESCE(search_result.name, 'no-name'),
            COALESCE(search_result.email, 'no-email'),
            search_result.date_created;
    END LOOP;

END $$; 