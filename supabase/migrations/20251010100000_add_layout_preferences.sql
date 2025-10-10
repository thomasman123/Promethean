-- Add layout preference column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS layout_preference VARCHAR(50) DEFAULT 'classic';

-- Add comment for the column
COMMENT ON COLUMN users.layout_preference IS 'User layout preference: classic or modern';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_layout_preference ON users(layout_preference);

