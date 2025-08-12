-- Add flag to track users created for data purposes (not yet invited)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_for_data BOOLEAN DEFAULT false NOT NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_profiles_created_for_data ON profiles(created_for_data);

-- Update team_members view to include the created_for_data flag
CREATE OR REPLACE VIEW team_members AS
SELECT 
  aa.account_id,
  p.id AS user_id,
  p.email,
  p.full_name,
  aa.role,
  aa.is_active,
  aa.granted_at,
  p.created_for_data
FROM account_access aa
JOIN profiles p ON p.id = aa.user_id
WHERE aa.is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.created_for_data IS 'True if this user profile was auto-created for data linking purposes (not yet officially invited)';
