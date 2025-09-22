-- Add scope field to data_tables to support personal vs team views
-- This mirrors the dashboard_views table structure for consistency

-- Add scope column with default 'private' for existing tables
ALTER TABLE data_tables 
ADD COLUMN scope text DEFAULT 'private' CHECK (scope = ANY (ARRAY['private'::text, 'team'::text, 'global'::text]));

-- Add comment explaining the scope field
COMMENT ON COLUMN data_tables.scope IS 'Visibility scope: private (personal), team (account-wide), global (system-wide)';

-- Create indexes for better performance when filtering by scope
CREATE INDEX IF NOT EXISTS idx_data_tables_scope ON data_tables(scope);
CREATE INDEX IF NOT EXISTS idx_data_tables_account_scope ON data_tables(account_id, scope);
CREATE INDEX IF NOT EXISTS idx_data_tables_created_by_scope ON data_tables(created_by, scope);

-- Update existing tables to be private by default (they were essentially personal before)
UPDATE data_tables SET scope = 'private' WHERE scope IS NULL;

-- Make scope NOT NULL after setting defaults
ALTER TABLE data_tables ALTER COLUMN scope SET NOT NULL; 