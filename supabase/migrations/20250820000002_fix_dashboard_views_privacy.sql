-- Fix dashboard_views privacy: remove generic account-scoped policies that leaked private views
DO $$ BEGIN
  DROP POLICY IF EXISTS sel_account_scoped ON public.dashboard_views;
  DROP POLICY IF EXISTS ins_account_scoped ON public.dashboard_views;
  DROP POLICY IF EXISTS upd_account_scoped ON public.dashboard_views;
  DROP POLICY IF EXISTS del_account_scoped ON public.dashboard_views;
  DROP POLICY IF EXISTS admin_all ON public.dashboard_views;
EXCEPTION WHEN others THEN NULL; END $$;

-- Rely on the fine-grained policies defined in 20250116000001_create_dashboard_views.sql 