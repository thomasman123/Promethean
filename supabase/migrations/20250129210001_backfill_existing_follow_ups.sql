-- Backfill existing follow-ups from appointments that have follow_up outcome and date
INSERT INTO follow_ups (
  appointment_id,
  account_id,
  scheduled_for,
  assigned_to_user_id,
  assigned_to_name,
  assigned_to_ghl_id,
  status
) 
SELECT 
  a.id,
  a.account_id,
  a.follow_up_at,
  a.sales_rep_user_id,
  a.sales_rep,
  a.sales_rep_ghl_id,
  CASE 
    WHEN a.follow_up_at < NOW() THEN 'overdue'
    ELSE 'pending'
  END as status
FROM appointments a
WHERE a.show_outcome = 'follow up' 
AND a.follow_up_at IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM follow_ups f 
  WHERE f.appointment_id = a.id
);

-- Update appointments to reflect they have follow-ups
UPDATE appointments a
SET has_follow_ups = true,
    follow_up_count = 1
WHERE a.show_outcome = 'follow up' 
AND a.follow_up_at IS NOT NULL
AND EXISTS (
  SELECT 1 FROM follow_ups f 
  WHERE f.appointment_id = a.id
); 