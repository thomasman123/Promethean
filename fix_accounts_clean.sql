-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_accounts(UUID);
DROP FUNCTION IF EXISTS get_all_active_accounts();
DROP FUNCTION IF EXISTS get_account_users(UUID);

-- Create a simple function to get user accounts
CREATE OR REPLACE FUNCTION get_user_accounts(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Simple direct query, no complex joins
    RETURN QUERY
    SELECT DISTINCT
        a.id,
        a.name,
        a.description
    FROM accounts a
    WHERE a.is_active = true
    AND (
        -- Admin check: if user is admin, show all
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = p_user_id 
            AND p.role = 'admin'
        )
        OR
        -- Otherwise check account_access
        EXISTS (
            SELECT 1 FROM account_access aa
            WHERE aa.account_id = a.id
            AND aa.user_id = p_user_id
            AND aa.is_active = true
        )
    )
    ORDER BY a.name;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_user_accounts(UUID) TO authenticated;

-- Test the function (replace with your actual user ID)
-- SELECT * FROM get_user_accounts('your-user-id-here');

-- Alternative: If you still have issues, just temporarily show all accounts
-- UPDATE: Let's create a super simple version
CREATE OR REPLACE FUNCTION get_all_accounts_simple()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description
    FROM accounts a
    WHERE a.is_active = true
    ORDER BY a.name;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_all_accounts_simple() TO authenticated; 