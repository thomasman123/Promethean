-- Create function to extract unique country codes from contact phone numbers
CREATE OR REPLACE FUNCTION get_unique_country_codes(p_account_id UUID)
RETURNS TABLE(country_code TEXT, contact_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      -- Extract country codes from phone numbers starting with +
      WHEN phone ~ '^\+1[0-9]' THEN '+1'
      WHEN phone ~ '^\+44[0-9]' THEN '+44'
      WHEN phone ~ '^\+61[0-9]' THEN '+61'
      WHEN phone ~ '^\+49[0-9]' THEN '+49'
      WHEN phone ~ '^\+33[0-9]' THEN '+33'
      WHEN phone ~ '^\+81[0-9]' THEN '+81'
      WHEN phone ~ '^\+86[0-9]' THEN '+86'
      WHEN phone ~ '^\+91[0-9]' THEN '+91'
      WHEN phone ~ '^\+55[0-9]' THEN '+55'
      WHEN phone ~ '^\+39[0-9]' THEN '+39'
      WHEN phone ~ '^\+34[0-9]' THEN '+34'
      WHEN phone ~ '^\+7[0-9]' THEN '+7'
      WHEN phone ~ '^\+52[0-9]' THEN '+52'
      WHEN phone ~ '^\+31[0-9]' THEN '+31'
      WHEN phone ~ '^\+46[0-9]' THEN '+46'
      WHEN phone ~ '^\+47[0-9]' THEN '+47'
      WHEN phone ~ '^\+45[0-9]' THEN '+45'
      WHEN phone ~ '^\+41[0-9]' THEN '+41'
      WHEN phone ~ '^\+43[0-9]' THEN '+43'
      WHEN phone ~ '^\+32[0-9]' THEN '+32'
      -- Generic extraction for other codes (up to 4 digits)
      WHEN phone ~ '^\+[0-9]{1,4}' THEN 
        SUBSTRING(phone FROM '^\+[0-9]{1,4}')
      ELSE 'Unknown'
    END as country_code,
    COUNT(*) as contact_count
  FROM contacts 
  WHERE account_id = p_account_id 
    AND phone IS NOT NULL 
    AND phone != ''
  GROUP BY 1
  HAVING COUNT(*) > 0
  ORDER BY contact_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unique_country_codes(UUID) TO authenticated;

COMMENT ON FUNCTION get_unique_country_codes(UUID) IS 'Extract unique country codes from contact phone numbers for business hours configuration'; 