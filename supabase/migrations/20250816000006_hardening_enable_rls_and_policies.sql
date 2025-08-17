-- Alpha hardening: enable RLS and apply least-privilege policies

-- 1) Enable RLS on base tables (safe to re-run)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.dials ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.calendar_mappings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.account_utm_rules ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.account_attribution_settings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.utm_attribution_mappings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.dashboard_views ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

-- Helper to create standard account-scoped policies for a table with account_id
CREATE OR REPLACE FUNCTION create_account_scoped_policies(p_table regclass, p_account_column text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('CREATE POLICY sel_account_scoped ON %s FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.account_access aa WHERE aa.user_id = auth.uid() AND aa.account_id = %s.%I AND aa.is_active)
  )', p_table, p_table, p_account_column);

  EXECUTE format('CREATE POLICY ins_account_scoped ON %s FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.account_access aa WHERE aa.user_id = auth.uid() AND aa.account_id = %s.%I AND aa.is_active)
  )', p_table, p_table, p_account_column);

  EXECUTE format('CREATE POLICY upd_account_scoped ON %s FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.account_access aa WHERE aa.user_id = auth.uid() AND aa.account_id = %s.%I AND aa.is_active)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.account_access aa WHERE aa.user_id = auth.uid() AND aa.account_id = %s.%I AND aa.is_active)
  )', p_table, p_table, p_account_column, p_table, p_account_column);

  EXECUTE format('CREATE POLICY del_account_scoped ON %s FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.account_access aa WHERE aa.user_id = auth.uid() AND aa.account_id = %s.%I AND aa.is_active)
  )', p_table, p_table, p_account_column);

  -- Admin override
  EXECUTE format('CREATE POLICY admin_all ON %s FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')
  )', p_table);
END; $$;

-- Apply to account-scoped tables
SELECT create_account_scoped_policies('public.appointments', 'account_id');
SELECT create_account_scoped_policies('public.discoveries', 'account_id');
SELECT create_account_scoped_policies('public.dials', 'account_id');
SELECT create_account_scoped_policies('public.calendar_mappings', 'account_id');
SELECT create_account_scoped_policies('public.account_utm_rules', 'account_id');
SELECT create_account_scoped_policies('public.account_attribution_settings', 'account_id');
SELECT create_account_scoped_policies('public.utm_attribution_mappings', 'account_id');
SELECT create_account_scoped_policies('public.dashboard_views', 'account_id');

-- appointment_payments is scoped via appointment -> account
CREATE POLICY sel_account_scoped ON public.appointment_payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.account_access aa ON aa.account_id = a.account_id AND aa.user_id = auth.uid() AND aa.is_active
    WHERE a.id = appointment_payments.appointment_id
  )
);
CREATE POLICY ins_account_scoped ON public.appointment_payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.account_access aa ON aa.account_id = a.account_id AND aa.user_id = auth.uid() AND aa.is_active
    WHERE a.id = appointment_payments.appointment_id
  )
);
CREATE POLICY upd_account_scoped ON public.appointment_payments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.account_access aa ON aa.account_id = a.account_id AND aa.user_id = auth.uid() AND aa.is_active
    WHERE a.id = appointment_payments.appointment_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.account_access aa ON aa.account_id = a.account_id AND aa.user_id = auth.uid() AND aa.is_active
    WHERE a.id = appointment_payments.appointment_id
  )
);
CREATE POLICY del_account_scoped ON public.appointment_payments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.account_access aa ON aa.account_id = a.account_id AND aa.user_id = auth.uid() AND aa.is_active
    WHERE a.id = appointment_payments.appointment_id
  )
);
CREATE POLICY admin_all ON public.appointment_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 3) Views: set invoker security where applicable
-- If these views exist, set security options (safe if they don't)
DO $$ BEGIN
  EXECUTE 'ALTER VIEW public.deprecated_mappings_summary SET (security_invoker = true, security_barrier = true)';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 4) Tighten grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Lock down functions
REVOKE ALL ON FUNCTION admin_complete_account_cleanup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_complete_account_cleanup(uuid) TO authenticated;
REVOKE ALL ON FUNCTION admin_clean_account_ghl_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_clean_account_ghl_data(uuid) TO authenticated;
REVOKE ALL ON FUNCTION admin_wipe_account_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_wipe_account_data(uuid) TO authenticated; 