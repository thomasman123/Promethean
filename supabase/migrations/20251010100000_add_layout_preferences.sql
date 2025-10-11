-- Add layout preference column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS layout_preference VARCHAR(50) DEFAULT 'classic';

-- Add comment for the column
COMMENT ON COLUMN profiles.layout_preference IS 'User layout preference: classic or modern';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_layout_preference ON profiles(layout_preference);

