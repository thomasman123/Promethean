-- Debug: Check actual appointment and dial data for linking analysis
-- This will help understand why 0 links are being created

-- 1. Check appointment fields and sample data
SELECT 
    'appointments_sample' as type,
    a.id,
    a.contact_id,
    a.date_booked,
    a.date_booked_for,
    a.created_at
FROM appointments a 
WHERE a.date_booked >= '2025-08-20'
ORDER BY a.date_booked DESC
LIMIT 5;

-- 2. Check dial fields and sample data  
SELECT 
    'dials_sample' as type,
    d.id,
    d.contact_id,
    d.date_called,
    d.created_at,
    d.booked,
    d.booked_appointment_id
FROM dials d
WHERE d.date_called >= '2025-08-20'
ORDER BY d.date_called DESC
LIMIT 5;

-- 3. Check potential matches for Aug 21-25 specifically
SELECT 
    'potential_matches' as type,
    a.id as appointment_id,
    a.date_booked,
    a.date_booked_for,
    a.contact_id,
    d.id as dial_id,
    d.date_called,
    d.contact_id as dial_contact_id,
    d.booked,
    EXTRACT(EPOCH FROM (a.date_booked - d.date_called))/60 as minutes_diff_booked,
    EXTRACT(EPOCH FROM (a.date_booked_for - d.date_called))/60 as minutes_diff_booked_for
FROM appointments a
INNER JOIN dials d ON d.contact_id = a.contact_id
WHERE a.date_booked >= '2025-08-21' 
  AND a.date_booked < '2025-08-26'
  AND a.contact_id IS NOT NULL
  AND d.contact_id IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called))) <= 30 * 60 -- 30 minutes
ORDER BY a.date_booked DESC, ABS(EXTRACT(EPOCH FROM (a.date_booked - d.date_called)))
LIMIT 10;

-- 4. Alternative: check with date_booked_for instead
SELECT 
    'potential_matches_alt' as type,
    a.id as appointment_id,
    a.date_booked,
    a.date_booked_for,
    a.contact_id,
    d.id as dial_id,
    d.date_called,
    d.contact_id as dial_contact_id,
    d.booked,
    EXTRACT(EPOCH FROM (a.date_booked_for - d.date_called))/60 as minutes_diff
FROM appointments a
INNER JOIN dials d ON d.contact_id = a.contact_id
WHERE a.date_booked >= '2025-08-21' 
  AND a.date_booked < '2025-08-26'
  AND a.contact_id IS NOT NULL
  AND d.contact_id IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (a.date_booked_for - d.date_called))) <= 30 * 60 -- 30 minutes
ORDER BY a.date_booked DESC, ABS(EXTRACT(EPOCH FROM (a.date_booked_for - d.date_called)))
LIMIT 10; 