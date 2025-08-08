-- Create function to execute metrics queries safely
-- This function allows the metrics engine to execute dynamic SQL with parameters

CREATE OR REPLACE FUNCTION execute_metrics_query(
  query_sql TEXT,
  query_params JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_sql TEXT;
  param_key TEXT;
  param_value TEXT;
  result_row RECORD;
  json_result JSONB = '[]'::jsonb;
  row_json JSONB;
BEGIN
  -- Start with the base query
  final_sql := query_sql;
  
  -- Replace parameter placeholders with actual values
  FOR param_key, param_value IN SELECT * FROM jsonb_each_text(query_params)
  LOOP
    -- Replace parameter placeholders (e.g., $account_id with actual value)
    final_sql := replace(final_sql, '$' || param_key, quote_literal(param_value));
  END LOOP;
  
  -- Log the final SQL for debugging (remove in production)
  RAISE NOTICE 'Executing SQL: %', final_sql;
  
  -- Execute the dynamic SQL and collect results
  FOR result_row IN EXECUTE final_sql
  LOOP
    -- Convert each row to JSON and add to result array
    row_json := to_jsonb(result_row);
    json_result := json_result || jsonb_build_array(row_json);
  END LOOP;
  
  -- Return each JSON object as a separate row
  FOR row_json IN SELECT jsonb_array_elements(json_result)
  LOOP
    result := row_json;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_metrics_query(TEXT, JSONB) TO authenticated;

-- Create a simpler version that returns a single JSONB array
CREATE OR REPLACE FUNCTION execute_metrics_query_array(
  query_sql TEXT,
  query_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_sql TEXT;
  param_key TEXT;
  param_value TEXT;
  result_cursor REFCURSOR;
  result_record RECORD;
  json_result JSONB = '[]'::jsonb;
BEGIN
  -- Start with the base query
  final_sql := query_sql;
  
  -- Replace parameter placeholders with actual values
  FOR param_key, param_value IN SELECT * FROM jsonb_each_text(query_params)
  LOOP
    -- Replace parameter placeholders (e.g., $account_id with actual value)
    final_sql := replace(final_sql, '$' || param_key, quote_literal(param_value));
  END LOOP;
  
  -- Log the final SQL for debugging (remove in production)
  RAISE NOTICE 'Executing SQL: %', final_sql;
  
  -- Execute the dynamic SQL and build JSON array
  FOR result_record IN EXECUTE final_sql
  LOOP
    json_result := json_result || jsonb_build_array(to_jsonb(result_record));
  END LOOP;
  
  RETURN json_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_metrics_query_array(TEXT, JSONB) TO authenticated; 