-- Update thomas@heliosscale.com to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'thomas@heliosscale.com';

-- If the profile doesn't exist yet, we can't insert it here since we don't have the user ID
-- The user needs to sign up first, then this migration will work 