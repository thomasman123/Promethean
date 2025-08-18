-- Backfill local_date columns for existing data
-- This populates the timezone-aware local date columns for all existing rows

-- Update appointments
UPDATE appointments 
SET 
  local_date = (SELECT local_date FROM compute_local_dates(appointments.date_booked_for, COALESCE(accounts.business_timezone, 'UTC'))),
  local_week = (SELECT local_week FROM compute_local_dates(appointments.date_booked_for, COALESCE(accounts.business_timezone, 'UTC'))),
  local_month = (SELECT local_month FROM compute_local_dates(appointments.date_booked_for, COALESCE(accounts.business_timezone, 'UTC')))
FROM accounts
WHERE appointments.account_id = accounts.id
  AND (appointments.local_date IS NULL OR appointments.local_week IS NULL OR appointments.local_month IS NULL);

-- Update dials
UPDATE dials 
SET 
  local_date = (SELECT local_date FROM compute_local_dates(dials.date_called, COALESCE(accounts.business_timezone, 'UTC'))),
  local_week = (SELECT local_week FROM compute_local_dates(dials.date_called, COALESCE(accounts.business_timezone, 'UTC'))),
  local_month = (SELECT local_month FROM compute_local_dates(dials.date_called, COALESCE(accounts.business_timezone, 'UTC')))
FROM accounts
WHERE dials.account_id = accounts.id
  AND (dials.local_date IS NULL OR dials.local_week IS NULL OR dials.local_month IS NULL);

-- Update discoveries
UPDATE discoveries 
SET 
  local_date = (SELECT local_date FROM compute_local_dates(discoveries.date_booked_for, COALESCE(accounts.business_timezone, 'UTC'))),
  local_week = (SELECT local_week FROM compute_local_dates(discoveries.date_booked_for, COALESCE(accounts.business_timezone, 'UTC'))),
  local_month = (SELECT local_month FROM compute_local_dates(discoveries.date_booked_for, COALESCE(accounts.business_timezone, 'UTC')))
FROM accounts
WHERE discoveries.account_id = accounts.id
  AND (discoveries.local_date IS NULL OR discoveries.local_week IS NULL OR discoveries.local_month IS NULL); 