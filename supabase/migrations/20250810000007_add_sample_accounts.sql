-- Add sample accounts for testing the account dropdown

-- Insert sample accounts if they don't already exist
INSERT INTO accounts (id, name, description, is_active) 
VALUES 
  ('01234567-0123-4567-8901-000000000001', 'Acme Corporation', 'Main corporate account for Acme Corp', true),
  ('01234567-0123-4567-8901-000000000002', 'Beta Industries', 'Industrial solutions company', true),
  ('01234567-0123-4567-8901-000000000003', 'Gamma Solutions', 'Technology consulting firm', true)
ON CONFLICT (id) DO NOTHING; 