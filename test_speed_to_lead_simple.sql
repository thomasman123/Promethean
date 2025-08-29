-- Simple test to verify Speed to Lead calculation works
-- This mimics the exact query structure from the engine

-- Test 1: Count contacts that should match the Speed to Lead criteria
SELECT 
    'test_1_contact_count' as test,
    COUNT(*) as count
FROM contacts
WHERE contacts.date_added IS NOT NULL
    AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL);

-- Test 2: Test the CTE structure with actual data
WITH contact_speed_to_lead AS (
    SELECT 
        contacts.id,
        contacts.date_added,
        contacts.account_id,
        EXTRACT(EPOCH FROM (
            (SELECT MIN(date_called) FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL) 
            - contacts.date_added
        )) as speed_to_lead_seconds
    FROM contacts
    WHERE contacts.date_added IS NOT NULL
        AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL)
    LIMIT 5
)
SELECT 
    'test_2_cte_sample' as test,
    id,
    date_added,
    account_id,
    speed_to_lead_seconds
FROM contact_speed_to_lead;

-- Test 3: Test the final aggregation
WITH contact_speed_to_lead AS (
    SELECT 
        contacts.id,
        contacts.date_added,
        contacts.account_id,
        EXTRACT(EPOCH FROM (
            (SELECT MIN(date_called) FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL) 
            - contacts.date_added
        )) as speed_to_lead_seconds
    FROM contacts
    WHERE contacts.date_added IS NOT NULL
        AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL)
)
SELECT 
    'test_3_aggregation' as test,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN speed_to_lead_seconds IS NOT NULL THEN 1 END) as contacts_with_speed,
    COUNT(CASE WHEN speed_to_lead_seconds >= 0 THEN 1 END) as contacts_with_positive_speed,
    COALESCE(ROUND(AVG(speed_to_lead_seconds)), 0) as avg_speed_to_lead
FROM contact_speed_to_lead
WHERE speed_to_lead_seconds IS NOT NULL 
    AND speed_to_lead_seconds >= 0; 