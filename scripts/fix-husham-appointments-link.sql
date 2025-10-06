-- Fix Husham's appointments by linking them to his user profile
-- Run this in Supabase SQL Editor
-- Problem: Appointments have sales_rep = 'Husham Abulqasim' but sales_rep_user_id = NULL
-- This causes them to not show up in his dashboard

-- Husham's user_id: ed37e0b6-a0d8-4e28-a48e-6e122a4250ff
-- Account: 7 Figure Sparky (f939561b-9212-421b-8aa8-eb7c5b65f40e)

-- Update sales_rep_user_id for all Husham's appointments
UPDATE appointments
SET 
  sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff',
  updated_at = NOW()
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND sales_rep = 'Husham Abulqasim'
  AND sales_rep_user_id IS NULL;

-- Update setter_user_id for appointments where Husham is the setter
UPDATE appointments
SET 
  setter_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff',
  updated_at = NOW()
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND setter = 'Husham Abulqasim'
  AND setter_user_id IS NULL;

-- Also link dials where Husham appears
UPDATE dials
SET 
  setter_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff',
  updated_at = NOW()
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND setter = 'Husham Abulqasim'
  AND setter_user_id IS NULL;

-- Link discoveries
UPDATE discoveries
SET 
  setter_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff',
  updated_at = NOW()
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND setter = 'Husham Abulqasim'
  AND setter_user_id IS NULL;

UPDATE discoveries
SET 
  sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff',
  updated_at = NOW()
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND sales_rep = 'Husham Abulqasim'
  AND sales_rep_user_id IS NULL;

-- Verify the fix
SELECT 
  'Appointments linked' as table_name,
  COUNT(*) as count
FROM appointments
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND sales_rep = 'Husham Abulqasim'
  AND sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff'

UNION ALL

SELECT 
  'Oct 6 appointments now visible' as table_name,
  COUNT(*) as count
FROM appointments
WHERE account_id = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'
  AND sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff'
  AND date_booked_for >= '2025-10-06T00:00:00Z'
  AND date_booked_for < '2025-10-07T00:00:00Z';

