-- Add RLS policy to allow users to insert their own profile
-- This is needed for the fallback profile creation in the client

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Also add a policy for account_access inserts (for fallback account access creation)
CREATE POLICY "Users can insert own account access" ON account_access
    FOR INSERT WITH CHECK (auth.uid() = user_id);
