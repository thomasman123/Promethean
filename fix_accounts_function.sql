-- Create a function to get user accounts without triggering RLS recursion
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
    RETURN QUERY
    SELECT DISTINCT
        a.id,
        a.name,
        a.description
    FROM accounts a
    INNER JOIN account_access aa ON aa.account_id = a.id
    WHERE aa.user_id = p_user_id
    AND aa.is_active = true
    AND a.is_active = true
    ORDER BY a.name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_accounts(UUID) TO authenticated;

-- Also create a simpler version that just returns all accounts
-- (for temporary use if the above doesn't work)
CREATE OR REPLACE FUNCTION get_all_active_accounts()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT
) 
SECURITY DEFINER
SET search_path = public
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_active_accounts() TO authenticated; 