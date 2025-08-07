-- Fix RLS policies for ghl_connections to allow OAuth callback
-- The OAuth callback runs server-side without user context, so we need to adjust policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view GHL connections for accounts they have access to" ON public.ghl_connections;
DROP POLICY IF EXISTS "Moderators and admins can manage GHL connections" ON public.ghl_connections;

-- Create more permissive policies that work with OAuth callback
CREATE POLICY "Users can view GHL connections for accounts they have access to" ON public.ghl_connections
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Allow INSERT during OAuth callback (no user context required for OAuth)
CREATE POLICY "Allow OAuth callback to create connections" ON public.ghl_connections
    FOR INSERT WITH CHECK (true);

-- Allow UPDATE for users with account access
CREATE POLICY "Users can update GHL connections for accounts they have access to" ON public.ghl_connections
    FOR UPDATE USING (
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator') 
            AND is_active = true
        )
    );

-- Allow DELETE for users with account access
CREATE POLICY "Users can delete GHL connections for accounts they have access to" ON public.ghl_connections
    FOR DELETE USING (
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator') 
            AND is_active = true
        )
    ); 