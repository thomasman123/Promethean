-- Add all three location IDs for 7 Figure Sparky account
INSERT INTO public.ghl_locations (account_id, location_id, is_primary, location_name)
VALUES 
  ('f939561b-9212-421b-8aa8-eb7c5b65f40e', 'Wdyx1rpH48ykfcM5fW5w', true, '7 Figure Sparky - Primary'),
  ('f939561b-9212-421b-8aa8-eb7c5b65f40e', 'ULXC0F4TP8esafqF918x', false, '7 Figure Sparky - Location 2'),
  ('f939561b-9212-421b-8aa8-eb7c5b65f40e', 'UaUWCKivipSD1QeicYDk', false, '7 Figure Sparky - Location 3')
ON CONFLICT (location_id) DO UPDATE 
SET account_id = EXCLUDED.account_id,
    location_name = EXCLUDED.location_name,
    updated_at = now();

