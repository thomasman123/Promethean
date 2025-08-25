-- Comprehensive backfill for dial-appointment linking
-- This script finds appointments, matches them to dials within 30 minutes before/after, 
-- and sets dial.booked=true and dial.booked_appointment_id

-- First, let's see what we're working with
SELECT 
    'Before backfill - Appointments' as table_info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN contact_id IS NOT NULL THEN 1 END) as with_contact_id,
    MIN(date_booked) as earliest_date,
    MAX(date_booked) as latest_date
FROM appointments
UNION ALL
SELECT 
    'Before backfill - Dials' as table_info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN contact_id IS NOT NULL THEN 1 END) as with_contact_id,
    MIN(date_called) as earliest_date,
    MAX(date_called) as latest_date
FROM dials
UNION ALL
SELECT 
    'Before backfill - Booked Dials' as table_info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN booked = true THEN 1 END) as booked_count,
    MIN(date_called) as earliest_date,
    MAX(date_called) as latest_date
FROM dials;

-- Main backfill logic: Link appointments to dials
WITH appointment_dial_matches AS (
    SELECT DISTINCT ON (a.id)
        a.id as appointment_id,
        a.date_booked as appointment_time,
        a.contact_id,
        d.id as dial_id,
        d.date_called as dial_time,
        d.booked as currently_booked,
        (d.date_called >= (a.date_booked - INTERVAL '30 minutes') 
         AND d.date_called <= (a.date_booked + INTERVAL '30 minutes')) as within_window
    FROM appointments a
    INNER JOIN dials d ON (
        d.account_id = a.account_id 
        AND d.contact_id = a.contact_id
        AND d.contact_id IS NOT NULL
        AND a.contact_id IS NOT NULL
        AND d.booked = false  -- Only link unbooked dials
        AND d.date_called >= (a.date_booked - INTERVAL '30 minutes')
        AND d.date_called <= (a.date_booked + INTERVAL '30 minutes')
    )
    WHERE a.contact_id IS NOT NULL
    ORDER BY a.id, ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked)))  -- Closest dial to appointment time
),
update_results AS (
    UPDATE dials 
    SET 
        booked = true,
        booked_appointment_id = appointment_dial_matches.appointment_id
    FROM appointment_dial_matches
    WHERE dials.id = appointment_dial_matches.dial_id
    RETURNING 
        dials.id as dial_id,
        appointment_dial_matches.appointment_id,
        appointment_dial_matches.appointment_time,
        appointment_dial_matches.dial_time
)
SELECT 
    'Backfill Results' as status,
    COUNT(*) as appointments_linked,
    MIN(appointment_time) as earliest_appointment,
    MAX(appointment_time) as latest_appointment
FROM update_results;

-- Show results after backfill
SELECT 
    'After backfill - Appointments' as table_info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN contact_id IS NOT NULL THEN 1 END) as with_contact_id,
    MIN(date_booked) as earliest_date,
    MAX(date_booked) as latest_date
FROM appointments
UNION ALL
SELECT 
    'After backfill - Dials' as table_info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN contact_id IS NOT NULL THEN 1 END) as with_contact_id,
    MIN(date_called) as earliest_date,
    MAX(date_called) as latest_date
FROM dials
UNION ALL
SELECT 
    'After backfill - Booked Dials' as table_info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN booked = true THEN 1 END) as booked_count,
    MIN(date_called) as earliest_date,
    MAX(date_called) as latest_date
FROM dials;

-- Specific check for August 21-25, 2024
SELECT 
    'August 21-25 Analysis' as analysis,
    COUNT(DISTINCT a.id) as appointments_in_period,
    COUNT(DISTINCT d.id) as dials_in_period,
    COUNT(DISTINCT CASE WHEN d.booked = true THEN d.id END) as booked_dials_in_period
FROM appointments a
FULL OUTER JOIN dials d ON (
    d.account_id = a.account_id 
    AND d.contact_id = a.contact_id
    AND ABS(EXTRACT(EPOCH FROM (d.date_called - a.date_booked))) <= 1800  -- 30 minutes = 1800 seconds
)
WHERE (
    (a.date_booked >= '2024-08-21'::timestamp AND a.date_booked < '2024-08-26'::timestamp)
    OR 
    (d.date_called >= '2024-08-21'::timestamp AND d.date_called < '2024-08-26'::timestamp)
);

-- Show some examples of successful links for verification
SELECT 
    'Sample Successful Links' as info,
    a.id as appointment_id,
    a.date_booked,
    d.id as dial_id,  
    d.date_called,
    d.booked,
    EXTRACT(EPOCH FROM (d.date_called - a.date_booked))/60 as minutes_between
FROM appointments a
INNER JOIN dials d ON d.booked_appointment_id = a.id
WHERE d.booked = true
ORDER BY a.date_booked DESC
LIMIT 10; 