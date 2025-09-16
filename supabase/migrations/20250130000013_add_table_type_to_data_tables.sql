-- Add table type to data_tables for different table structures
-- This allows for user-based tables vs account-based tables

-- Add table_type column to data_tables
ALTER TABLE data_tables ADD COLUMN IF NOT EXISTS table_type TEXT DEFAULT 'user_metrics';

-- Add constraint for valid table types
ALTER TABLE data_tables ADD CONSTRAINT check_table_type 
  CHECK (table_type IN ('user_metrics', 'account_metrics', 'time_series'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_data_tables_account_type ON data_tables(account_id, table_type);

-- Update existing tables to be user_metrics type
UPDATE data_tables SET table_type = 'user_metrics' WHERE table_type IS NULL;

-- Add comment
COMMENT ON COLUMN data_tables.table_type IS 'Type of data table: user_metrics (users as rows), account_metrics (account totals), time_series (time periods as rows)'; 