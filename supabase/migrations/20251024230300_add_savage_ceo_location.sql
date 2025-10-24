-- Add missing location entry for Savage CEO account
-- This location ID exists in the accounts table but was missing from ghl_locations
-- This was causing the appointment backfill to fail

INSERT INTO ghl_locations (account_id, location_id, location_name)
VALUES (
  'b78ea8cf-f327-4769-b4b8-1735acc0b9c3',
  'hkFsiYy04mFcKz8xzR9w',
  'Savage CEO - Primary Location'
)
ON CONFLICT (account_id, location_id) DO NOTHING;

