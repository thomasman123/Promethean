-- Comprehensive analysis of contacts table for Speed to Lead debugging

-- 1. Total contacts breakdown
SELECT 
    'total_contacts' as analysis,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN date_added IS NOT NULL THEN 1 END) as contacts_with_date_added,
    COUNT(CASE WHEN date_added IS NULL THEN 1 END) as contacts_without_date_added,
    MIN(date_added) as earliest_date_added,
    MAX(date_added) as latest_date_added
FROM contacts;

-- 2. Contacts by account
SELECT 
    'contacts_by_account' as analysis,
    account_id,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN date_added IS NOT NULL THEN 1 END) as contacts_with_date_added
FROM contacts
GROUP BY account_id
ORDER BY total_contacts DESC;

-- 3. Dials analysis
SELECT 
    'dials_analysis' as analysis,
    COUNT(*) as total_dials,
    COUNT(CASE WHEN contact_id IS NOT NULL THEN 1 END) as dials_with_contact_id,
    COUNT(CASE WHEN contact_id IS NULL THEN 1 END) as dials_without_contact_id,
    COUNT(DISTINCT contact_id) as unique_contacts_with_dials,
    MIN(date_called) as earliest_dial,
    MAX(date_called) as latest_dial
FROM dials;

-- 4. The key question: Why only 668 contacts match?
-- Let's break down the Speed to Lead criteria step by step

-- Step 4a: Contacts with date_added
SELECT 
    'step_4a_date_added' as analysis,
    COUNT(*) as contacts_with_date_added
FROM contacts 
WHERE contacts.date_added IS NOT NULL;

-- Step 4b: Contacts that have ANY dials with contact_id
SELECT 
    'step_4b_has_linked_dials' as analysis,
    COUNT(DISTINCT c.id) as contacts_with_linked_dials
FROM contacts c
WHERE EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = c.id AND dials.contact_id IS NOT NULL);

-- Step 4c: Contacts with BOTH date_added AND linked dials (this should be 668)
SELECT 
    'step_4c_both_criteria' as analysis,
    COUNT(*) as contacts_matching_both
FROM contacts c
WHERE c.date_added IS NOT NULL
    AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = c.id AND dials.contact_id IS NOT NULL);

-- 5. Sample of contacts that DON'T match - missing date_added
SELECT 
    'missing_date_added_sample' as analysis,
    c.id,
    c.name,
    c.email,
    c.phone,
    c.date_added,
    c.created_at,
    c.account_id,
    (SELECT COUNT(*) FROM dials d WHERE d.contact_id = c.id) as dial_count
FROM contacts c
WHERE c.date_added IS NULL
    AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = c.id AND dials.contact_id IS NOT NULL)
ORDER BY c.created_at DESC
LIMIT 5;

-- 6. Sample of contacts that DON'T match - missing linked dials
SELECT 
    'missing_linked_dials_sample' as analysis,
    c.id,
    c.name,
    c.email,
    c.phone,
    c.date_added,
    c.created_at,
    c.account_id,
    (SELECT COUNT(*) FROM dials d WHERE d.contact_id = c.id) as linked_dial_count
FROM contacts c
WHERE c.date_added IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = c.id AND dials.contact_id IS NOT NULL)
ORDER BY c.created_at DESC
LIMIT 5;

-- 7. Distribution of Speed to Lead values for the 668 contacts
WITH contact_speed_to_lead AS (
    SELECT 
        contacts.id,
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
    'speed_to_lead_distribution' as analysis,
    MIN(speed_to_lead_seconds) as min_seconds,
    MAX(speed_to_lead_seconds) as max_seconds,
    AVG(speed_to_lead_seconds) as avg_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY speed_to_lead_seconds) as median_seconds,
    COUNT(CASE WHEN speed_to_lead_seconds < 0 THEN 1 END) as negative_values,
    COUNT(CASE WHEN speed_to_lead_seconds = 0 THEN 1 END) as zero_values,
    COUNT(CASE WHEN speed_to_lead_seconds > 0 AND speed_to_lead_seconds <= 300 THEN 1 END) as under_5_minutes,
    COUNT(CASE WHEN speed_to_lead_seconds > 300 AND speed_to_lead_seconds <= 3600 THEN 1 END) as five_minutes_to_hour,
    COUNT(CASE WHEN speed_to_lead_seconds > 3600 THEN 1 END) as over_hour
FROM contact_speed_to_lead; 