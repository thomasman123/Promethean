-- Create function to apply business hours logic to contact timestamps
-- This adjusts contact creation times to business hours based on country code mappings
CREATE OR REPLACE FUNCTION apply_business_hours(
  p_contact_date_added TIMESTAMPTZ,
  p_phone TEXT,
  p_business_hours JSONB
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  country_code TEXT;
  business_hour JSONB;
  tz_name TEXT;
  start_time TIME;
  end_time TIME;
  contact_local_time TIMESTAMPTZ;
  contact_time_only TIME;
  adjusted_date TIMESTAMPTZ;
BEGIN
  -- Extract country code from phone number (stricter validation)
  country_code := CASE 
    WHEN p_phone ~ '^\+1[2-9][0-9]{9}$' THEN '+1'           -- US/Canada (10 digits after +1)
    WHEN p_phone ~ '^\+44[1-9][0-9]{8,9}$' THEN '+44'       -- UK
    WHEN p_phone ~ '^\+61[2-9][0-9]{8}$' THEN '+61'         -- Australia
    WHEN p_phone ~ '^\+49[1-9][0-9]{10,11}$' THEN '+49'     -- Germany
    WHEN p_phone ~ '^\+33[1-9][0-9]{8}$' THEN '+33'         -- France
    WHEN p_phone ~ '^\+81[1-9][0-9]{9,10}$' THEN '+81'      -- Japan
    WHEN p_phone ~ '^\+86[1-9][0-9]{10}$' THEN '+86'        -- China
    WHEN p_phone ~ '^\+91[6-9][0-9]{9}$' THEN '+91'         -- India
    WHEN p_phone ~ '^\+55[1-9][0-9]{10}$' THEN '+55'        -- Brazil
    -- Only include well-known country codes to avoid random numbers
    ELSE NULL
  END;
  
  -- If no country code found or no business hours configured, return original time
  IF country_code IS NULL OR p_business_hours IS NULL THEN
    RETURN p_contact_date_added;
  END IF;
  
  -- Find matching business hours configuration
  SELECT bh INTO business_hour
  FROM jsonb_array_elements(p_business_hours) AS bh
  WHERE bh->>'countryCode' = country_code
  LIMIT 1;
  
  -- If no matching business hours found, return original time
  IF business_hour IS NULL THEN
    RETURN p_contact_date_added;
  END IF;
  
  -- Extract timezone and business hours
  tz_name := business_hour->>'tz';
  start_time := (business_hour->>'startLocal')::TIME;
  end_time := (business_hour->>'endLocal')::TIME;
  
  -- Convert contact time to local timezone
  contact_local_time := p_contact_date_added AT TIME ZONE tz_name;
  contact_time_only := contact_local_time::TIME;
  
  -- Apply business hours logic
  IF contact_time_only < start_time THEN
    -- Contact created before business hours - move to start of business hours same day
    adjusted_date := (contact_local_time::DATE + start_time) AT TIME ZONE tz_name;
  ELSIF contact_time_only >= end_time THEN
    -- Contact created after business hours - move to start of business hours next day
    adjusted_date := ((contact_local_time::DATE + INTERVAL '1 day') + start_time) AT TIME ZONE tz_name;
  ELSE
    -- Contact created during business hours - keep original time
    adjusted_date := p_contact_date_added;
  END IF;
  
  RETURN adjusted_date;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION apply_business_hours(TIMESTAMPTZ, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION apply_business_hours(TIMESTAMPTZ, TEXT, JSONB) IS 'Adjust contact creation time to business hours based on country code and timezone mappings'; 