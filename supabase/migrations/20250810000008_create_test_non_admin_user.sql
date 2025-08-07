-- Create a test non-admin user for testing admin restrictions
-- This will help verify that the admin access control is working properly

-- Note: For testing purposes, you can manually create a non-admin user via signup
-- Then run this SQL to change their role:

-- Example to change thomas@heliosscale.com to moderator for testing (uncomment to test):
-- UPDATE profiles SET role = 'moderator' WHERE email = 'thomas@heliosscale.com';

-- To change back to admin after testing:
-- UPDATE profiles SET role = 'admin' WHERE email = 'thomas@heliosscale.com';

-- For now, let's just ensure we have some sample non-admin profiles in the system
-- (These will be created when users actually sign up)

-- Placeholder comment: Test users should be created via the signup process 