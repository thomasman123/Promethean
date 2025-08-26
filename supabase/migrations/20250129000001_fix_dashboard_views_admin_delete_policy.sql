-- Add missing admin DELETE policy for dashboard_views
-- This allows admins to delete team and global views from their account

CREATE POLICY "Admins can delete team/global views" ON public.dashboard_views
    FOR DELETE
    USING (
        scope IN ('team', 'global') AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND account_id = dashboard_views.account_id
            AND role = 'admin'
        )
    ); 