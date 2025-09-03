-- Debug Show Ups metric issue for 7 Figure Sparky account

-- First, find all accounts with "sparky" in the name
SELECT 
    id,
    name,
    is_active,
    ghl_location_id
FROM accounts 
WHERE name ILIKE '%sparky%'
ORDER BY name;

-- Check appointments for Sparky accounts in last month (December 2024)
SELECT 
    a.name as account_name,
    ap.id,
    ap.contact_name,
    ap.date_booked,
    ap.date_booked_for,
    ap.call_outcome,
    ap.show_outcome,
    ap.local_date,
    ap.created_at
FROM accounts a
JOIN appointments ap ON a.id = ap.account_id
WHERE a.name ILIKE '%sparky%'
  AND ap.date_booked >= '2024-12-01'
  AND ap.date_booked < '2025-01-01'
ORDER BY ap.date_booked DESC;

-- Count show ups by call_outcome variations
SELECT 
    a.name as account_name,
    ap.call_outcome,
    COUNT(*) as count
FROM accounts a
JOIN appointments ap ON a.id = ap.account_id
WHERE a.name ILIKE '%sparky%'
  AND ap.date_booked >= '2024-12-01'
  AND ap.date_booked < '2025-01-01'
GROUP BY a.name, ap.call_outcome
ORDER BY a.name, count DESC;

-- Check what the metric query would actually return
SELECT 
    COUNT(*) as total_appointments,
    COUNT(CASE WHEN call_outcome = 'Show' THEN 1 END) as show_exact_match,
    COUNT(CASE WHEN LOWER(call_outcome) = 'show' THEN 1 END) as show_case_insensitive,
    COUNT(CASE WHEN call_outcome ILIKE '%show%' THEN 1 END) as show_contains,
    array_agg(DISTINCT call_outcome) as all_outcomes
FROM appointments ap
JOIN accounts a ON a.id = ap.account_id
WHERE a.name ILIKE '%sparky%'
  AND ap.local_date >= '2024-12-01'
  AND ap.local_date < '2025-01-01';

-- Test the exact metric query from the registry
SELECT 
    a.name as account_name,
    COUNT(*) as value
FROM appointments ap
JOIN accounts a ON a.id = ap.account_id
WHERE a.name ILIKE '%sparky%'
  AND ap.local_date >= '2024-12-01'
  AND ap.local_date < '2025-01-01'
  AND ap.call_outcome = 'Show'
  AND ap.account_id = a.id
GROUP BY a.name; 