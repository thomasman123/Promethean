-- Tighten RLS for dashboard_views so private views are only visible to creator
-- and team/global are visible only to users with account_access on that account.

BEGIN;

-- Drop the overly broad read policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'dashboard_views' AND policyname = 'dashboard_views_read_policy'
  ) THEN
    EXECUTE 'DROP POLICY "dashboard_views_read_policy" ON public.dashboard_views';
  END IF;
END $$;

-- Create precise read policies
CREATE POLICY "read_private_own_views" ON public.dashboard_views
  FOR SELECT USING (
    scope = 'private' AND created_by = auth.uid()
  );

CREATE POLICY "read_team_views_with_access" ON public.dashboard_views
  FOR SELECT USING (
    scope = 'team' AND EXISTS (
      SELECT 1 FROM public.account_access aa
      WHERE aa.account_id = dashboard_views.account_id AND aa.user_id = auth.uid() AND aa.is_active = true
    )
  );

CREATE POLICY "read_global_views_with_access" ON public.dashboard_views
  FOR SELECT USING (
    scope = 'global' AND EXISTS (
      SELECT 1 FROM public.account_access aa
      WHERE aa.account_id = dashboard_views.account_id AND aa.user_id = auth.uid() AND aa.is_active = true
    )
  );

COMMIT; 