-- Migration to sync roles between profiles and account_access tables
-- This ensures both tables always have matching roles

-- First, create a function to sync profile role to all account_access records
CREATE OR REPLACE FUNCTION sync_profile_role_to_account_access()
RETURNS TRIGGER AS $$
BEGIN
    -- When profile role changes, update all account_access records for this user
    IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
        UPDATE account_access 
        SET role = NEW.role, updated_at = NOW()
        WHERE user_id = NEW.id;
        
        -- Log the sync
        RAISE NOTICE 'Synced profile role % to account_access for user %', NEW.role, NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to sync account_access role to profile
CREATE OR REPLACE FUNCTION sync_account_access_role_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When account_access role changes, update the profile role
    -- But only if this is the user's primary account (first account_access record by created_at)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
        -- Check if this is the primary account access record for this user
        IF NOT EXISTS (
            SELECT 1 FROM account_access aa2 
            WHERE aa2.user_id = NEW.user_id 
            AND aa2.created_at < NEW.created_at
            AND aa2.is_active = true
        ) THEN
            -- This is the primary account access, sync to profile
            UPDATE profiles 
            SET role = NEW.role, updated_at = NOW()
            WHERE id = NEW.user_id;
            
            -- Log the sync
            RAISE NOTICE 'Synced account_access role % to profile for user %', NEW.role, NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON profiles;
CREATE TRIGGER sync_profile_role_trigger
    AFTER UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_to_account_access();

DROP TRIGGER IF EXISTS sync_account_access_role_trigger ON account_access;
CREATE TRIGGER sync_account_access_role_trigger
    AFTER INSERT OR UPDATE OF role ON account_access
    FOR EACH ROW
    EXECUTE FUNCTION sync_account_access_role_to_profile();

-- Now fix existing mismatches
-- Strategy: Use the profile role as the source of truth and update account_access to match

-- Update account_access roles to match their corresponding profile roles
UPDATE account_access 
SET role = p.role, updated_at = NOW()
FROM profiles p
WHERE account_access.user_id = p.id 
AND account_access.role != p.role;

-- For users who have profiles but no account_access records, we'll leave them as is
-- since they might not have been granted access to any accounts yet

-- Create a function to manually sync roles if needed
CREATE OR REPLACE FUNCTION manual_sync_all_roles()
RETURNS TABLE(
    user_id uuid,
    email text,
    old_profile_role text,
    new_profile_role text,
    accounts_updated integer
) AS $$
DECLARE
    user_record RECORD;
    accounts_count integer;
BEGIN
    FOR user_record IN 
        SELECT p.id, p.email, p.role as profile_role
        FROM profiles p
    LOOP
        -- Count how many account_access records will be updated
        SELECT COUNT(*) INTO accounts_count
        FROM account_access aa
        WHERE aa.user_id = user_record.id AND aa.role != user_record.profile_role;
        
        -- Update account_access records to match profile role
        UPDATE account_access 
        SET role = user_record.profile_role, updated_at = NOW()
        WHERE user_id = user_record.id AND role != user_record.profile_role;
        
        -- Return the sync info if any updates were made
        IF accounts_count > 0 THEN
            RETURN QUERY SELECT 
                user_record.id,
                user_record.email,
                'various'::text,
                user_record.profile_role::text,
                accounts_count;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a view to easily check for role mismatches
CREATE OR REPLACE VIEW role_sync_status AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.role as profiles_role,
    aa.role as account_access_role,
    aa.account_id,
    a.name as account_name,
    CASE 
        WHEN p.role = aa.role THEN 'SYNCED'
        WHEN aa.role IS NULL THEN 'NO_ACCOUNT_ACCESS'
        ELSE 'MISMATCH'
    END as sync_status,
    aa.updated_at as account_access_updated_at,
    p.updated_at as profile_updated_at
FROM profiles p
LEFT JOIN account_access aa ON p.id = aa.user_id AND aa.is_active = true
LEFT JOIN accounts a ON aa.account_id = a.id
ORDER BY sync_status DESC, p.email, a.name;

COMMENT ON VIEW role_sync_status IS 'Shows the synchronization status between profiles.role and account_access.role';
COMMENT ON FUNCTION sync_profile_role_to_account_access() IS 'Trigger function that syncs profile role changes to all account_access records';
COMMENT ON FUNCTION sync_account_access_role_to_profile() IS 'Trigger function that syncs account_access role changes to profile (primary account only)';
COMMENT ON FUNCTION manual_sync_all_roles() IS 'Manual function to sync all roles from profiles to account_access'; 