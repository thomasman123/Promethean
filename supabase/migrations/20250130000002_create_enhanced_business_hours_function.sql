-- Create enhanced business hours function that supports weekday selection
CREATE OR REPLACE FUNCTION apply_business_hours_enhanced(
  p_contact_date_added TIMESTAMPTZ,
  p_phone TEXT,
  p_business_hours JSONB
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  country_info JSONB;
  business_hour JSONB;
  tz_name TEXT;
  start_time TIME;
  end_time TIME;
  working_days INTEGER[];
  contact_local_time TIMESTAMP;
  contact_day_of_week INTEGER;
  contact_time_only TIME;
  adjusted_date TIMESTAMPTZ;
  days_to_add INTEGER;
  i INTEGER;
BEGIN
  -- Get country info from phone number
  country_info := detect_phone_country(p_phone);
  
  -- If no country code found or no business hours configured, return original time
  IF country_info->>'country_code' IS NULL OR p_business_hours IS NULL THEN
    RETURN p_contact_date_added;
  END IF;
  
  -- Find matching business hours configuration
  SELECT bh INTO business_hour
  FROM jsonb_array_elements(p_business_hours) AS bh
  WHERE bh->>'countryCode' = country_info->>'country_code'
  LIMIT 1;
  
  -- If no matching business hours found, return original time
  IF business_hour IS NULL THEN
    RETURN p_contact_date_added;
  END IF;
  
  -- Extract timezone and business hours
  tz_name := business_hour->>'timezone';
  start_time := (business_hour->>'startTime')::TIME;
  end_time := (business_hour->>'endTime')::TIME;
  
  -- Extract working days (1=Monday, 7=Sunday)
  working_days := ARRAY(
    SELECT jsonb_array_elements_text(business_hour->'workingDays')::INTEGER
  );
  
  -- If no working days specified, default to Mon-Fri (1-5)
  IF array_length(working_days, 1) IS NULL THEN
    working_days := ARRAY[1,2,3,4,5];
  END IF;
  
  -- Convert contact time to local timezone
  contact_local_time := p_contact_date_added AT TIME ZONE tz_name;
  contact_day_of_week := EXTRACT(ISODOW FROM contact_local_time)::INTEGER;
  contact_time_only := contact_local_time::TIME;
  
  -- Check if current day is a working day
  IF NOT (contact_day_of_week = ANY(working_days)) THEN
    -- Find next working day
    days_to_add := 0;
    FOR i IN 1..7 LOOP
      days_to_add := i;
      IF ((contact_day_of_week + i - 1) % 7 + 1) = ANY(working_days) THEN
        EXIT;
      END IF;
    END LOOP;
    -- Move to start of business hours on next working day
    adjusted_date := ((contact_local_time::DATE + days_to_add * INTERVAL '1 day') + start_time) AT TIME ZONE tz_name;
  ELSIF contact_time_only < start_time THEN
    -- Contact created before business hours - move to start of business hours same day
    adjusted_date := (contact_local_time::DATE + start_time) AT TIME ZONE tz_name;
  ELSIF contact_time_only >= end_time THEN
    -- Contact created after business hours - find next working day
    days_to_add := 0;
    FOR i IN 1..7 LOOP
      days_to_add := i;
      IF ((contact_day_of_week + i - 1) % 7 + 1) = ANY(working_days) THEN
        EXIT;
      END IF;
    END LOOP;
    -- Move to start of business hours on next working day
    adjusted_date := ((contact_local_time::DATE + days_to_add * INTERVAL '1 day') + start_time) AT TIME ZONE tz_name;
  ELSE
    -- Contact created during business hours on a working day - keep original time
    adjusted_date := p_contact_date_added;
  END IF;
  
  RETURN adjusted_date;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION apply_business_hours_enhanced(TIMESTAMPTZ, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION apply_business_hours_enhanced(TIMESTAMPTZ, TEXT, JSONB) IS 'Enhanced business hours adjustment with weekday selection support'; 