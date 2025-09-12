-- Remove duplicate base columns (name, email, role) from existing table configurations
-- These columns are now handled by the base column definitions in the frontend

-- Update existing data_tables to remove duplicate base columns
UPDATE data_tables 
SET columns = (
  SELECT jsonb_agg(col)
  FROM jsonb_array_elements(columns) AS col
  WHERE col->>'field' NOT IN ('name', 'email', 'role')
     OR col->>'metricName' IS NOT NULL -- Keep metric columns even if they have these field names
),
updated_at = NOW()
WHERE columns IS NOT NULL
  AND jsonb_array_length(columns) > 0;

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up duplicate base columns from % data tables', updated_count;
END $$;

-- Verify the cleanup
DO $$
DECLARE
  table_record RECORD;
  duplicate_count INTEGER := 0;
BEGIN
  FOR table_record IN 
    SELECT id, name, columns
    FROM data_tables
    WHERE columns IS NOT NULL
  LOOP
    -- Check if any base columns still exist in the configuration
    IF EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(table_record.columns) AS col
      WHERE col->>'field' IN ('name', 'email', 'role')
        AND col->>'metricName' IS NULL
    ) THEN
      duplicate_count := duplicate_count + 1;
      RAISE NOTICE 'Table % (%) still has duplicate base columns', table_record.name, table_record.id;
    END IF;
  END LOOP;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE 'All data tables cleaned successfully - no duplicate base columns found';
  ELSE
    RAISE NOTICE 'Found % tables with remaining duplicate base columns', duplicate_count;
  END IF;
END $$; 