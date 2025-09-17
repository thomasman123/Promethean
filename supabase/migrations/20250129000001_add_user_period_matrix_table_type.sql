-- Add user_period_matrix to the allowed table_type values
ALTER TABLE data_tables DROP CONSTRAINT IF EXISTS check_table_type;

ALTER TABLE data_tables ADD CONSTRAINT check_table_type 
CHECK (table_type = ANY (ARRAY['user_metrics'::text, 'account_metrics'::text, 'time_series'::text, 'user_period_matrix'::text]));

-- Update the comment to reflect the new table type
COMMENT ON COLUMN data_tables.table_type IS 'Type of data table: user_metrics (users as rows), account_metrics (account totals), time_series (time periods as rows), user_period_matrix (users vs periods matrix)'; 