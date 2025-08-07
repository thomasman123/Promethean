-- Fix RLS policies for ghl_connections to allow admin users to access all connections
-- Admin users have app-wide access and should be able to see all GHL connections

-- Drop and recreate the SELECT policy to include admin access
DROP POLICY IF EXISTS "Users can view GHL connections for accounts they have access to" ON public.ghl_connections;

CREATE POLICY "Users can view GHL connections for accounts they have access to" ON public.ghl_connections
    FOR SELECT USING (
        -- Allow admins to see all connections
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Allow users to see connections for accounts they have access to
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Drop and recreate the UPDATE policy to include admin access
DROP POLICY IF EXISTS "Users can update GHL connections for accounts they have access to" ON public.ghl_connections;

CREATE POLICY "Users can update GHL connections for accounts they have access to" ON public.ghl_connections
    FOR UPDATE USING (
        -- Allow admins to update all connections
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Allow users to update connections for accounts they have moderator access to
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator') 
            AND is_active = true
        )
    );

-- Drop and recreate the DELETE policy to include admin access
DROP POLICY IF EXISTS "Users can delete GHL connections for accounts they have access to" ON public.ghl_connections;

CREATE POLICY "Users can delete GHL connections for accounts they have access to" ON public.ghl_connections
    FOR DELETE USING (
        -- Allow admins to delete all connections
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Allow users to delete connections for accounts they have moderator access to
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator') 
            AND is_active = true
        )
    );

-- Also fix calendar_mappings RLS policies for admin access
-- Drop and recreate the SELECT policy for calendar_mappings
DROP POLICY IF EXISTS "Users can view calendar mappings for accounts they have access to" ON public.calendar_mappings;

CREATE POLICY "Users can view calendar mappings for accounts they have access to" ON public.calendar_mappings
    FOR SELECT USING (
        -- Allow admins to see all calendar mappings
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Allow users to see calendar mappings for accounts they have access to
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Drop and recreate the ALL policy for calendar_mappings
DROP POLICY IF EXISTS "Moderators and admins can manage calendar mappings" ON public.calendar_mappings;

CREATE POLICY "Moderators and admins can manage calendar mappings" ON public.calendar_mappings
    FOR ALL USING (
        -- Allow admins to manage all calendar mappings
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Allow moderators to manage calendar mappings for accounts they have access to
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator') 
            AND is_active = true
        )
    ); 