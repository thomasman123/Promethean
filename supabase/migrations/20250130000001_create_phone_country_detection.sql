-- Create a function to detect country from phone number
CREATE OR REPLACE FUNCTION detect_phone_country(phone_number TEXT)
RETURNS JSONB AS $$
DECLARE
    country_info JSONB;
BEGIN
    -- Clean the phone number
    phone_number := REGEXP_REPLACE(phone_number, '[^0-9+]', '', 'g');
    
    -- Match phone patterns
    country_info := CASE
        -- US/Canada (+1)
        WHEN phone_number ~ '^\+1[2-9][0-9]{9}$' THEN 
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
        
        -- Australia (+61) - handle various formats
        WHEN phone_number ~ '^\+61[2-9][0-9]{8}$' OR 
             phone_number ~ '^\+614[0-9]{8}$' THEN
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
            
        -- UK (+44)
        WHEN phone_number ~ '^\+44[0-9]{10,11}$' THEN
            jsonb_build_object(
                'country_code', '+44',
                'country_name', 'United Kingdom',
                'flag', '🇬🇧',
                'timezone_options', ARRAY['Europe/London']
            )
            
        -- Germany (+49)
        WHEN phone_number ~ '^\+49[0-9]{10,12}$' THEN
            jsonb_build_object(
                'country_code', '+49',
                'country_name', 'Germany',
                'flag', '🇩🇪',
                'timezone_options', ARRAY['Europe/Berlin']
            )
            
        -- France (+33)
        WHEN phone_number ~ '^\+33[0-9]{9}$' THEN
            jsonb_build_object(
                'country_code', '+33',
                'country_name', 'France',
                'flag', '🇫🇷',
                'timezone_options', ARRAY['Europe/Paris']
            )
            
        -- Spain (+34)
        WHEN phone_number ~ '^\+34[0-9]{9}$' THEN
            jsonb_build_object(
                'country_code', '+34',
                'country_name', 'Spain',
                'flag', '🇪🇸',
                'timezone_options', ARRAY['Europe/Madrid']
            )
            
        -- Italy (+39)
        WHEN phone_number ~ '^\+39[0-9]{9,10}$' THEN
            jsonb_build_object(
                'country_code', '+39',
                'country_name', 'Italy',
                'flag', '🇮🇹',
                'timezone_options', ARRAY['Europe/Rome']
            )
            
        -- Japan (+81)
        WHEN phone_number ~ '^\+81[0-9]{10,11}$' THEN
            jsonb_build_object(
                'country_code', '+81',
                'country_name', 'Japan',
                'flag', '🇯🇵',
                'timezone_options', ARRAY['Asia/Tokyo']
            )
            
        -- China (+86)
        WHEN phone_number ~ '^\+86[0-9]{11}$' THEN
            jsonb_build_object(
                'country_code', '+86',
                'country_name', 'China',
                'flag', '🇨🇳',
                'timezone_options', ARRAY['Asia/Shanghai']
            )
            
        -- India (+91)
        WHEN phone_number ~ '^\+91[0-9]{10}$' THEN
            jsonb_build_object(
                'country_code', '+91',
                'country_name', 'India',
                'flag', '🇮🇳',
                'timezone_options', ARRAY['Asia/Kolkata']
            )
            
        -- Brazil (+55)
        WHEN phone_number ~ '^\+55[0-9]{10,11}$' THEN
            jsonb_build_object(
                'country_code', '+55',
                'country_name', 'Brazil',
                'flag', '🇧🇷',
                'timezone_options', ARRAY['America/Sao_Paulo']
            )
            
        -- Mexico (+52)
        WHEN phone_number ~ '^\+52[0-9]{10}$' THEN
            jsonb_build_object(
                'country_code', '+52',
                'country_name', 'Mexico',
                'flag', '🇲🇽',
                'timezone_options', ARRAY[
                    'America/Mexico_City',
                    'America/Cancun',
                    'America/Tijuana'
                ]
            )
            
        -- New Zealand (+64)
        WHEN phone_number ~ '^\+64[0-9]{8,9}$' THEN
            jsonb_build_object(
                'country_code', '+64',
                'country_name', 'New Zealand',
                'flag', '🇳🇿',
                'timezone_options', ARRAY['Pacific/Auckland']
            )
            
        -- South Africa (+27)
        WHEN phone_number ~ '^\+27[0-9]{9}$' THEN
            jsonb_build_object(
                'country_code', '+27',
                'country_name', 'South Africa',
                'flag', '🇿🇦',
                'timezone_options', ARRAY['Africa/Johannesburg']
            )
            
        -- Morocco (+212)
        WHEN phone_number ~ '^\+212[0-9]{9}$' THEN
            jsonb_build_object(
                'country_code', '+212',
                'country_name', 'Morocco',
                'flag', '🇲🇦',
                'timezone_options', ARRAY['Africa/Casablanca']
            )
            
        -- Indonesia (+62)
        WHEN phone_number ~ '^\+62[0-9]{9,12}$' THEN
            jsonb_build_object(
                'country_code', '+62',
                'country_name', 'Indonesia',
                'flag', '🇮🇩',
                'timezone_options', ARRAY['Asia/Jakarta']
            )
            
        -- Philippines (+63)
        WHEN phone_number ~ '^\+63[0-9]{10}$' THEN
            jsonb_build_object(
                'country_code', '+63',
                'country_name', 'Philippines',
                'flag', '🇵🇭',
                'timezone_options', ARRAY['Asia/Manila']
            )
            
        -- Venezuela (+58)
        WHEN phone_number ~ '^\+58[0-9]{10}$' THEN
            jsonb_build_object(
                'country_code', '+58',
                'country_name', 'Venezuela',
                'flag', '🇻🇪',
                'timezone_options', ARRAY['America/Caracas']
            )
            
        -- Default for unknown patterns
        ELSE
            jsonb_build_object(
                'country_code', LEFT(phone_number, 
                    CASE 
                        WHEN phone_number ~ '^\+[0-9]{1}' THEN 2
                        WHEN phone_number ~ '^\+[0-9]{2}' THEN 3
                        WHEN phone_number ~ '^\+[0-9]{3}' THEN 4
                        ELSE 4
                    END
                ),
                'country_name', 'Unknown',
                'flag', '🌍',
                'timezone_options', ARRAY['UTC']
            )
    END;
    
    RETURN country_info;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION detect_phone_country(TEXT) TO authenticated;

-- Create a function to get available phone countries from contacts
CREATE OR REPLACE FUNCTION get_available_phone_countries()
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
            (detect_phone_country(phone))->>'country_code' as country_code,
            (detect_phone_country(phone))->>'country_name' as country_name,
            (detect_phone_country(phone))->>'flag' as flag,
            (detect_phone_country(phone))->'timezone_options' as timezone_options,
            COUNT(*) as contact_count
        FROM contacts
        WHERE phone IS NOT NULL AND phone != ''
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_available_phone_countries() TO authenticated;

COMMENT ON FUNCTION detect_phone_country(TEXT) IS 'Detect country information from phone number including timezone options';
COMMENT ON FUNCTION get_available_phone_countries() IS 'Get all available phone countries from contacts with timezone options'; 