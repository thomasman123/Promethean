-- Debug: Check accounts table for GHL OAuth connections
SELECT 
    id,
    name,
    ghl_location_id,
    ghl_auth_type,
    CASE 
        WHEN ghl_api_key IS NOT NULL THEN 'present' 
        ELSE 'missing' 
    END as ghl_api_key_status,
    ghl_token_expires_at,
    future_sync_enabled,
    created_at
FROM accounts 
WHERE ghl_auth_type = 'oauth2' OR ghl_location_id IS NOT NULL OR ghl_api_key IS NOT NULL
ORDER BY created_at DESC;

-- Check if the webhook location ID exists anywhere
SELECT 
    id,
    name,
    ghl_location_id,
    'Location ID: UaUWCKivipSD1QeicYDk exists' as note
FROM accounts 
WHERE ghl_location_id = 'UaUWCKivipSD1QeicYDk'; 