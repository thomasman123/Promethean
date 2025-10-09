-- Migration to backfill all appointments and discoveries with missing user ID links
-- This links sales_rep/setter names to actual profile IDs via account_access

DO $$
DECLARE
  appointments_updated INT := 0;
  discoveries_updated INT := 0;
  setter_appointments_updated INT := 0;
BEGIN
  -- Update appointments: Link sales_rep names to sales_rep_user_id
  WITH matched_reps AS (
    SELECT DISTINCT
      a.id as appointment_id,
      p.id as profile_id,
      a.sales_rep,
      p.full_name
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
      p.id as profile_id,
      a.setter,
      p.full_name
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
      p.id as profile_id,
      d.setter,
      p.full_name
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

  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  - Appointments sales reps linked: %', appointments_updated;
  RAISE NOTICE '  - Appointments setters linked: %', setter_appointments_updated;
  RAISE NOTICE '  - Discoveries setters linked: %', discoveries_updated;
END $$;

-- Create a reusable function to link user IDs for appointments/discoveries
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

