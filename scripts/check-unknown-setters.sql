-- Diagnostic script to check Unknown setter status

-- 1. Count total Unknown setters in appointments
SELECT 'APPOINTMENTS - Total Unknown' as metric, COUNT(*) as count
FROM appointments 
WHERE setter = 'Unknown' OR setter IS NULL OR setter = '';

-- 2. Count Unknown setters that have matching dials (should have been caught by backfill)
SELECT 'APPOINTMENTS - Unknown with matching dials' as metric, COUNT(*) as count
FROM appointments a
WHERE (a.setter = 'Unknown' OR a.setter IS NULL)
  AND EXISTS (
    SELECT 1 FROM dials d 
    WHERE d.contact_id = a.contact_id 
      AND d.account_id = a.account_id
      AND d.setter IS NOT NULL
      AND d.setter != 'Unknown'
      AND d.date_called >= (a.date_booked - INTERVAL '60 minutes')
      AND d.date_called <= a.date_booked
  );

-- 3. Count Unknown setters with no matching dials (need GHL API backfill)
SELECT 'APPOINTMENTS - Unknown with NO matching dials' as metric, COUNT(*) as count
FROM appointments a
WHERE (a.setter = 'Unknown' OR a.setter IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM dials d 
    WHERE d.contact_id = a.contact_id 
      AND d.account_id = a.account_id
      AND d.date_called >= (a.date_booked - INTERVAL '60 minutes')
      AND d.date_called <= a.date_booked
  );

-- 4. Count Unknown setters with no contact_id (can't match)
SELECT 'APPOINTMENTS - Unknown with NULL contact_id' as metric, COUNT(*) as count
FROM appointments a
WHERE (a.setter = 'Unknown' OR a.setter IS NULL)
  AND a.contact_id IS NULL;

-- 5. Sample of Unknown appointments
SELECT 
    a.id,
    a.setter,
    a.contact_id,
    a.ghl_appointment_id,
    a.date_booked,
    (SELECT COUNT(*) FROM dials d 
     WHERE d.contact_id = a.contact_id 
       AND d.account_id = a.account_id
       AND d.date_called >= (a.date_booked - INTERVAL '60 minutes')
       AND d.date_called <= a.date_booked) as matching_dials_count
FROM appointments a
WHERE (a.setter = 'Unknown' OR a.setter IS NULL)
ORDER BY a.date_booked DESC
LIMIT 10;

