-- Create table to store dashboard filter presets per account
CREATE TABLE IF NOT EXISTS dashboard_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, name)
);

ALTER TABLE dashboard_filter_presets ENABLE ROW LEVEL SECURITY;

-- RLS: members of account can read; admins/moderators can manage
CREATE POLICY dashboard_filter_presets_select ON dashboard_filter_presets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.user_id = auth.uid()
      AND aa.account_id = dashboard_filter_presets.account_id
      AND aa.is_active = true
    )
  );

CREATE POLICY dashboard_filter_presets_modify ON dashboard_filter_presets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.user_id = auth.uid()
      AND aa.account_id = dashboard_filter_presets.account_id
      AND aa.is_active = true
      AND aa.role IN ('admin','moderator')
    )
  );

COMMENT ON TABLE dashboard_filter_presets IS 'Saved dashboard filter presets per account'; 