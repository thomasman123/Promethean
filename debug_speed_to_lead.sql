-- Debug Speed to Lead data issues
-- This will help us understand why the metric shows 0

-- 1. Check if we have contacts with date_added
SELECT 
    'contacts_with_date_added' as check_type,
    COUNT(*) as count,
    MIN(date_added) as earliest_date,
    MAX(date_added) as latest_date
FROM contacts 
WHERE date_added IS NOT NULL;

-- 2. Check if we have dials with contact_id
SELECT 
    'dials_with_contact_id' as check_type,
    COUNT(*) as count,
    MIN(date_called) as earliest_date,
    MAX(date_called) as latest_date
FROM dials 
WHERE contact_id IS NOT NULL;

-- 3. Check if we have dials without contact_id (the problem)
SELECT 
    'dials_without_contact_id' as check_type,
    COUNT(*) as count,
    MIN(date_called) as earliest_date,
    MAX(date_called) as latest_date
FROM dials 
WHERE contact_id IS NULL;

-- 4. Check contacts that should have matching dials
SELECT 
    'contacts_with_potential_dials' as check_type,
    COUNT(DISTINCT c.id) as contact_count,
    COUNT(d.id) as dial_count
FROM contacts c
LEFT JOIN dials d ON (
    d.email = c.email OR d.phone = c.phone
)
WHERE c.date_added IS NOT NULL
    AND d.id IS NOT NULL;

-- 5. Sample of contacts and their potential dial matches
SELECT 
    'sample_contact_dial_matches' as check_type,
    c.id as contact_id,
    c.name as contact_name,
    c.email,
    c.phone,
    c.date_added,
    d.id as dial_id,
    d.contact_id as dial_contact_id,
    d.date_called,
    d.email as dial_email,
    d.phone as dial_phone,
    EXTRACT(EPOCH FROM (d.date_called - c.date_added)) as speed_to_lead_seconds
FROM contacts c
LEFT JOIN dials d ON (
    (c.email IS NOT NULL AND d.email = c.email) OR 
    (c.phone IS NOT NULL AND d.phone = c.phone)
)
WHERE c.date_added IS NOT NULL
    AND d.date_called IS NOT NULL
ORDER BY c.date_added DESC
LIMIT 10;

-- 6. Test the actual Speed to Lead calculation for a few contacts
WITH contact_speed_to_lead AS (
    SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.date_added,
        c.account_id,
        EXTRACT(EPOCH FROM (
            (SELECT MIN(date_called) FROM dials WHERE dials.contact_id = c.id AND dials.contact_id IS NOT NULL) 
            - c.date_added
        )) as speed_to_lead_seconds
    FROM contacts c
    WHERE c.date_added IS NOT NULL
        AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = c.id AND dials.contact_id IS NOT NULL)
    LIMIT 5
)
SELECT 
    'speed_to_lead_test' as check_type,
    id,
    name,
    email,
    phone,
    date_added,
    speed_to_lead_seconds
FROM contact_speed_to_lead; 