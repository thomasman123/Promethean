-- Fix phone country detection to only handle US/Canada and Australia
-- with stronger pattern matching to avoid false positives

CREATE OR REPLACE FUNCTION detect_phone_country_simple(phone_number TEXT)
RETURNS JSONB AS $$
DECLARE
    clean_phone TEXT;
    country_info JSONB;
BEGIN
    -- Clean the phone number - remove all non-digit characters except +
    clean_phone := REGEXP_REPLACE(phone_number, '[^0-9+]', '', 'g');
    
    -- Only match US/Canada and Australia with strict patterns
    country_info := CASE
        -- US/Canada: +1 followed by area code (2-9) then 7 digits
        WHEN clean_phone ~ '^\+1[2-9][0-9]{9}$' THEN 
            jsonb_build_object(
                'country_code', '+1',
                'country_name', 'United States/Canada',
                'flag', '🇺🇸',
                'timezone_options', ARRAY[
                    'America/New_York',
                    'America/Chicago', 
                    'America/Denver',
                    'America/Los_Angeles',
                    'America/Toronto'
                ]
            )
        
        -- Australia: +61 followed by area code (2-9) and 8 digits OR mobile (4) and 8 digits
        WHEN clean_phone ~ '^\+61[2-9][0-9]{8}$' OR clean_phone ~ '^\+614[0-9]{8}$' THEN
            jsonb_build_object(
                'country_code', '+61',
                'country_name', 'Australia',
                'flag', '🇦🇺',
                'timezone_options', ARRAY[
                    'Australia/Sydney',
                    'Australia/Melbourne',
                    'Australia/Brisbane',
                    'Australia/Perth',
                    'Australia/Adelaide'
                ]
            )
            
        -- Handle malformed Australian numbers (like +611, +612, etc.)
        -- Try to fix them by removing the extra digit if it makes sense
        WHEN clean_phone ~ '^\+61[0-9]{1}[0-9]{9,10}$' THEN
            CASE 
                -- If it's +61 + 1 extra digit + valid pattern, it might be fixable
                WHEN SUBSTRING(clean_phone, 5, 1) IN ('2','3','4','5','6','7','8','9') 
                     AND LENGTH(clean_phone) = 13 THEN
                    jsonb_build_object(
                        'country_code', '+61',
                        'country_name', 'Australia (Fixed)',
                        'flag', '🇦🇺',
                        'timezone_options', ARRAY[
                            'Australia/Sydney',
                            'Australia/Melbourne',
                            'Australia/Brisbane',
                            'Australia/Perth',
                            'Australia/Adelaide'
                        ]
                    )
                ELSE NULL
            END
            
        -- Default: Unknown (don't try to guess other countries)
        ELSE NULL
    END;
    
    -- Return null for unrecognized patterns instead of guessing
    RETURN country_info;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a simple function that only returns US and Australia
CREATE OR REPLACE FUNCTION get_available_phone_countries_simple()
RETURNS TABLE(
    country_code TEXT,
    country_name TEXT,
    flag TEXT,
    timezone_options TEXT[],
    contact_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH phone_countries AS (
        SELECT 
            (detect_phone_country_simple(phone))->>'country_code' as country_code,
            (detect_phone_country_simple(phone))->>'country_name' as country_name,
            (detect_phone_country_simple(phone))->>'flag' as flag,
            (detect_phone_country_simple(phone))->'timezone_options' as timezone_options,
            COUNT(*) as contact_count
        FROM contacts
        WHERE phone IS NOT NULL 
            AND phone != ''
            AND detect_phone_country_simple(phone) IS NOT NULL
        GROUP BY 1, 2, 3, 4
    )
    SELECT 
        pc.country_code::TEXT,
        pc.country_name::TEXT,
        pc.flag::TEXT,
        ARRAY(SELECT jsonb_array_elements_text(pc.timezone_options))::TEXT[],
        pc.contact_count
    FROM phone_countries pc
    WHERE pc.country_code IS NOT NULL
    ORDER BY pc.contact_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_phone_country_simple(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_phone_countries_simple() TO authenticated;

-- Update the enhanced business hours function to use the simple detection
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
  -- Get country info from phone number using simple detection
  country_info := detect_phone_country_simple(p_phone);
  
  -- If no country code found or no business hours configured, return original time
  IF country_info IS NULL OR country_info->>'country_code' IS NULL OR p_business_hours IS NULL THEN
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

COMMENT ON FUNCTION detect_phone_country_simple(TEXT) IS 'Detect country information from phone number - US/Canada and Australia only';
COMMENT ON FUNCTION get_available_phone_countries_simple() IS 'Get available phone countries - US/Canada and Australia only'; 