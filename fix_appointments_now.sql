-- Quick fix: Link all unlinked appointments and discoveries to users
-- Run this directly in Supabase SQL Editor or via psql

-- Step 1: Link Husham's appointments (66 appointments)
UPDATE appointments
SET 
  sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff',
  updated_at = NOW()
WHERE sales_rep = 'Husham Abulqasim'
  AND sales_rep_user_id IS NULL
  AND account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e';

-- Step 2: Link William Wright's appointments (17 appointments)
UPDATE appointments
SET 
  sales_rep_user_id = (
    SELECT p.id FROM profiles p
    INNER JOIN account_access aa ON aa.user_id = p.id
    WHERE LOWER(TRIM(p.full_name)) = 'william wright'
      AND aa.account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
      AND aa.is_active = true
    LIMIT 1
  ),
  updated_at = NOW()
WHERE sales_rep = 'William Wright'
  AND sales_rep_user_id IS NULL
  AND account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e';

-- Step 3: Link Ryan Thompson's appointments (13 appointments)
UPDATE appointments
SET 
  sales_rep_user_id = 'e64f032f-1908-4ba5-aa71-e51f27ff0ae6',
  updated_at = NOW()
WHERE sales_rep = 'Ryan Thompson'
  AND sales_rep_user_id IS NULL
  AND account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e';

-- Step 4: Link David Bitondo's appointments (9 appointments)
UPDATE appointments
SET 
  sales_rep_user_id = '1ab3622d-9da8-4ce8-ab49-97346a9c5e7e',
  updated_at = NOW()
WHERE sales_rep = 'David Bitondo'
  AND sales_rep_user_id IS NULL
  AND account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e';

-- Step 5: Create the reusable function for future use
CREATE OR REPLACE FUNCTION link_appointment_discovery_users()
RETURNS TABLE (
  appointments_sales_reps_linked INT,
  appointments_setters_linked INT,
  discoveries_setters_linked INT
) AS $$
DECLARE
  appointments_updated INT := 0;
  discoveries_updated INT := 0;
  setter_appointments_updated INT := 0;
BEGIN
  -- Update appointments: Link sales_rep names to sales_rep_user_id
  WITH matched_reps AS (
    SELECT DISTINCT
      a.id as appointment_id,
      p.id as profile_id
    FROM appointments a
    INNER JOIN account_access aa ON aa.account_id = a.account_id AND aa.is_active = true
    INNER JOIN profiles p ON p.id = aa.user_id
    WHERE a.sales_rep IS NOT NULL 
      AND a.sales_rep != ''
      AND a.sales_rep_user_id IS NULL
      AND LOWER(TRIM(p.full_name)) = LOWER(TRIM(a.sales_rep))
  )
  UPDATE appointments a
  SET 
    sales_rep_user_id = m.profile_id,
    updated_at = NOW()
  FROM matched_reps m
  WHERE a.id = m.appointment_id;

  GET DIAGNOSTICS appointments_updated = ROW_COUNT;

  -- Update appointments: Link setter names to setter_user_id
  WITH matched_setters AS (
    SELECT DISTINCT
      a.id as appointment_id,
      p.id as profile_id
    FROM appointments a
    INNER JOIN account_access aa ON aa.account_id = a.account_id AND aa.is_active = true
    INNER JOIN profiles p ON p.id = aa.user_id
    WHERE a.setter IS NOT NULL 
      AND a.setter != ''
      AND a.setter_user_id IS NULL
      AND LOWER(TRIM(p.full_name)) = LOWER(TRIM(a.setter))
  )
  UPDATE appointments a
  SET 
    setter_user_id = m.profile_id,
    updated_at = NOW()
  FROM matched_setters m
  WHERE a.id = m.appointment_id;

  GET DIAGNOSTICS setter_appointments_updated = ROW_COUNT;

  -- Update discoveries: Link setter names to setter_user_id
  WITH matched_setters AS (
    SELECT DISTINCT
      d.id as discovery_id,
      p.id as profile_id
    FROM discoveries d
    INNER JOIN account_access aa ON aa.account_id = d.account_id AND aa.is_active = true
    INNER JOIN profiles p ON p.id = aa.user_id
    WHERE d.setter IS NOT NULL 
      AND d.setter != ''
      AND d.setter_user_id IS NULL
      AND LOWER(TRIM(p.full_name)) = LOWER(TRIM(d.setter))
  )
  UPDATE discoveries d
  SET 
    setter_user_id = m.profile_id,
    updated_at = NOW()
  FROM matched_setters m
  WHERE d.id = m.discovery_id;

  GET DIAGNOSTICS discoveries_updated = ROW_COUNT;

  RETURN QUERY SELECT appointments_updated, setter_appointments_updated, discoveries_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_appointment_discovery_users() IS 'Reusable function to link appointment and discovery user IDs based on name matching with account_access profiles';

-- Verification query
SELECT 
  'Fix completed!' as status,
  COUNT(*) FILTER (WHERE sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff') as husham_appointments,
  COUNT(*) FILTER (WHERE sales_rep = 'William Wright' AND sales_rep_user_id IS NOT NULL) as william_appointments,
  COUNT(*) FILTER (WHERE sales_rep = 'Ryan Thompson' AND sales_rep_user_id IS NOT NULL) as ryan_appointments,
  COUNT(*) FILTER (WHERE sales_rep = 'David Bitondo' AND sales_rep_user_id IS NOT NULL) as david_appointments
FROM appointments;

