-- Insert some test accounts
INSERT INTO accounts (id, name, description, is_active) VALUES
  ('01234567-0123-4567-8901-000000000001', 'Acme Inc', 'Enterprise customer management', true),
  ('01234567-0123-4567-8901-000000000002', 'TechCorp', 'Professional services', true),
  ('01234567-0123-4567-8901-000000000003', 'StartupXYZ', 'Growth stage startup', true)
ON CONFLICT (id) DO NOTHING;

-- Note: User profiles and account access will be created automatically 
-- when users sign up through the trigger function 