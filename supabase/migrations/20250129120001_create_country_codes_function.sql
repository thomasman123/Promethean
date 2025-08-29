-- Create function to extract unique country codes from contact phone numbers
CREATE OR REPLACE FUNCTION get_unique_country_codes(p_account_id UUID)
RETURNS TABLE(country_code TEXT, contact_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH country_code_extraction AS (
    SELECT 
      CASE 
        -- Only extract from properly formatted international numbers starting with +
        WHEN phone ~ '^\+1[2-9][0-9]{9}$' THEN '+1'           -- US/Canada (10 digits after +1)
        WHEN phone ~ '^\+44[1-9][0-9]{8,9}$' THEN '+44'       -- UK
        WHEN phone ~ '^\+61[2-9][0-9]{8}$' THEN '+61'         -- Australia
        WHEN phone ~ '^\+49[1-9][0-9]{10,11}$' THEN '+49'     -- Germany
        WHEN phone ~ '^\+33[1-9][0-9]{8}$' THEN '+33'         -- France
        WHEN phone ~ '^\+81[1-9][0-9]{9,10}$' THEN '+81'      -- Japan
        WHEN phone ~ '^\+86[1-9][0-9]{10}$' THEN '+86'        -- China
        WHEN phone ~ '^\+91[6-9][0-9]{9}$' THEN '+91'         -- India
        WHEN phone ~ '^\+55[1-9][0-9]{10}$' THEN '+55'        -- Brazil
        -- Only include well-known country codes to avoid random numbers
        ELSE NULL
      END as country_code
    FROM contacts 
    WHERE account_id = p_account_id 
      AND phone IS NOT NULL 
      AND phone != ''
  )
  SELECT 
    country_code,
    COUNT(*) as contact_count
  FROM country_code_extraction
  WHERE country_code IS NOT NULL  -- Filter out NULL country codes
  GROUP BY country_code
  HAVING COUNT(*) > 0
  ORDER BY contact_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unique_country_codes(UUID) TO authenticated;

COMMENT ON FUNCTION get_unique_country_codes(UUID) IS 'Extract unique country codes from contact phone numbers for business hours configuration'; 