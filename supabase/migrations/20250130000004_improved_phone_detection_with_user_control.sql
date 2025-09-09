-- Improved phone country detection with better accuracy and user control
-- Detects more countries but with stricter patterns to reduce false positives

CREATE OR REPLACE FUNCTION detect_phone_country_improved(phone_number TEXT)
RETURNS JSONB AS $$
DECLARE
    clean_phone TEXT;
    country_info JSONB;
BEGIN
    -- Clean the phone number - remove all non-digit characters except +
    clean_phone := REGEXP_REPLACE(phone_number, '[^0-9+]', '', 'g');
    
    -- Skip obviously invalid numbers
    IF clean_phone IS NULL OR clean_phone = '' OR clean_phone ~ '^[0]+$' OR LENGTH(clean_phone) < 8 THEN
        RETURN NULL;
    END IF;
    
    -- Match countries with strict patterns to reduce false positives
    country_info := CASE
        -- US/Canada: +1 followed by valid area code (2-9) then 7 digits
        WHEN clean_phone ~ '^\+1[2-9][0-9]{2}[0-9]{7}$' THEN 
            jsonb_build_object(
                'country_code', '+1',
                'country_name', 'United States/Canada',
                'flag', '🇺🇸',
                'confidence', 'high',
                'timezone_options', ARRAY[
                    'America/New_York',
                    'America/Chicago', 
                    'America/Denver',
                    'America/Los_Angeles',
                    'America/Toronto'
                ]
            )
        
        -- Australia: +61 followed by valid patterns
        WHEN clean_phone ~ '^\+61[2-9][0-9]{8}$' OR clean_phone ~ '^\+614[0-9]{8}$' THEN
            jsonb_build_object(
                'country_code', '+61',
                'country_name', 'Australia',
                'flag', '🇦🇺',
                'confidence', 'high',
                'timezone_options', ARRAY[
                    'Australia/Sydney',
                    'Australia/Melbourne',
                    'Australia/Brisbane',
                    'Australia/Perth',
                    'Australia/Adelaide'
                ]
            )
            
        -- New Zealand: +64 followed by valid patterns (landline 3-9, mobile 2)
        WHEN clean_phone ~ '^\+64[3-9][0-9]{7}$' OR clean_phone ~ '^\+642[0-9]{7,8}$' THEN
            jsonb_build_object(
                'country_code', '+64',
                'country_name', 'New Zealand',
                'flag', '🇳🇿',
                'confidence', 'high',
                'timezone_options', ARRAY['Pacific/Auckland']
            )
            
        -- UK: +44 followed by valid patterns (stricter)
        WHEN clean_phone ~ '^\+44[1-9][0-9]{9,10}$' THEN
            jsonb_build_object(
                'country_code', '+44',
                'country_name', 'United Kingdom',
                'flag', '🇬🇧',
                'confidence', 'medium',
                'timezone_options', ARRAY['Europe/London']
            )
            
        -- India: +91 followed by valid mobile patterns (stricter)
        WHEN clean_phone ~ '^\+91[6-9][0-9]{9}$' THEN
            jsonb_build_object(
                'country_code', '+91',
                'country_name', 'India',
                'flag', '🇮🇳',
                'confidence', 'medium',
                'timezone_options', ARRAY['Asia/Kolkata']
            )
            
        -- Germany: +49 followed by valid patterns
        WHEN clean_phone ~ '^\+49[1-9][0-9]{10,11}$' THEN
            jsonb_build_object(
                'country_code', '+49',
                'country_name', 'Germany',
                'flag', '🇩🇪',
                'confidence', 'medium',
                'timezone_options', ARRAY['Europe/Berlin']
            )
            
        -- France: +33 followed by valid patterns
        WHEN clean_phone ~ '^\+33[1-9][0-9]{8}$' THEN
            jsonb_build_object(
                'country_code', '+33',
                'country_name', 'France',
                'flag', '🇫🇷',
                'confidence', 'medium',
                'timezone_options', ARRAY['Europe/Paris']
            )
            
        -- Spain: +34 followed by valid patterns
        WHEN clean_phone ~ '^\+34[6-9][0-9]{8}$' THEN
            jsonb_build_object(
                'country_code', '+34',
                'country_name', 'Spain',
                'flag', '🇪🇸',
                'confidence', 'medium',
                'timezone_options', ARRAY['Europe/Madrid']
            )
            
        -- Brazil: +55 followed by valid patterns
        WHEN clean_phone ~ '^\+55[1-9][0-9]{9,10}$' THEN
            jsonb_build_object(
                'country_code', '+55',
                'country_name', 'Brazil',
                'flag', '🇧🇷',
                'confidence', 'medium',
                'timezone_options', ARRAY['America/Sao_Paulo']
            )
            
        -- Canada (separate from US): +1 with Canadian area codes
        WHEN clean_phone ~ '^\+1(204|226|236|249|250|289|306|343|365|403|416|418|431|437|438|450|506|514|519|548|579|581|587|604|613|639|647|672|705|709|778|780|782|807|819|825|867|873|902|905)' THEN
            jsonb_build_object(
                'country_code', '+1',
                'country_name', 'Canada',
                'flag', '🇨🇦',
                'confidence', 'high',
                'timezone_options', ARRAY[
                    'America/Toronto',
                    'America/Vancouver',
                    'America/Edmonton',
                    'America/Winnipeg',
                    'America/Halifax'
                ]
            )
            
        -- Handle malformed Australian numbers (like +611, +612, etc.)
        WHEN clean_phone ~ '^\+61[0-9]{1}[2-9][0-9]{8}$' AND LENGTH(clean_phone) = 13 THEN
            jsonb_build_object(
                'country_code', '+61',
                'country_name', 'Australia (Fixed)',
                'flag', '🇦🇺',
                'confidence', 'medium',
                'timezone_options', ARRAY[
                    'Australia/Sydney',
                    'Australia/Melbourne',
                    'Australia/Brisbane',
                    'Australia/Perth',
                    'Australia/Adelaide'
                ]
            )
            
        -- Low confidence matches for other patterns (user can decide)
        WHEN clean_phone ~ '^\+[0-9]{1,3}[0-9]{7,12}$' THEN
            jsonb_build_object(
                'country_code', LEFT(clean_phone, 
                    CASE 
                        WHEN clean_phone ~ '^\+[0-9]{1}[^0-9]' THEN 2
                        WHEN clean_phone ~ '^\+[0-9]{2}[^0-9]' THEN 3
                        WHEN clean_phone ~ '^\+[0-9]{3}[^0-9]' THEN 4
                        ELSE 4
                    END
                ),
                'country_name', 'Unknown',
                'flag', '🌍',
                'confidence', 'low',
                'timezone_options', ARRAY['UTC']
            )
            
        -- Default: Invalid
        ELSE NULL
    END;
    
    RETURN country_info;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function that returns all detected countries with confidence levels
CREATE OR REPLACE FUNCTION get_detected_phone_countries()
RETURNS TABLE(
    country_code TEXT,
    country_name TEXT,
    flag TEXT,
    confidence TEXT,
    timezone_options TEXT[],
    contact_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH phone_countries AS (
        SELECT 
            (detect_phone_country_improved(phone))->>'country_code' as country_code,
            (detect_phone_country_improved(phone))->>'country_name' as country_name,
            (detect_phone_country_improved(phone))->>'flag' as flag,
            (detect_phone_country_improved(phone))->>'confidence' as confidence,
            (detect_phone_country_improved(phone))->'timezone_options' as timezone_options,
            COUNT(*) as contact_count
        FROM contacts
        WHERE phone IS NOT NULL 
            AND phone != ''
            AND detect_phone_country_improved(phone) IS NOT NULL
        GROUP BY 1, 2, 3, 4, 5
    )
    SELECT 
        pc.country_code::TEXT,
        pc.country_name::TEXT,
        pc.flag::TEXT,
        pc.confidence::TEXT,
        ARRAY(SELECT jsonb_array_elements_text(pc.timezone_options))::TEXT[],
        pc.contact_count
    FROM phone_countries pc
    WHERE pc.country_code IS NOT NULL
    ORDER BY 
        CASE pc.confidence 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
            ELSE 4 
        END,
        pc.contact_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update the enhanced business hours function to use improved detection
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
  -- Get country info from phone number using improved detection
  country_info := detect_phone_country_improved(p_phone);
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_phone_country_improved(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_detected_phone_countries() TO authenticated;

COMMENT ON FUNCTION detect_phone_country_improved(TEXT) IS 'Detect country information from phone number with confidence levels';
COMMENT ON FUNCTION get_detected_phone_countries() IS 'Get all detected phone countries with confidence levels for user selection'; 