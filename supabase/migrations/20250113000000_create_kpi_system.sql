-- KPI System Tables
-- This migration creates the foundation for tracking KPIs at user and account level

-- KPI Definitions table: stores what KPIs to track
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric_key TEXT NOT NULL, -- matches METRICS_REGISTRY keys (e.g., 'total_appointments', 'cash_collected')
  target_value DECIMAL NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('minimum', 'maximum', 'exact')),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
  period_days INTEGER, -- for custom periods, number of days
  applies_to TEXT NOT NULL CHECK (applies_to IN ('user', 'account')),
  assigned_user_ids UUID[], -- null or empty = all users in account
  assigned_roles TEXT[], -- filter by role: ['setter', 'closer', 'sales_rep']
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_kpi_definitions_account ON kpi_definitions(account_id) WHERE is_active = true;
CREATE INDEX idx_kpi_definitions_metric ON kpi_definitions(metric_key) WHERE is_active = true;

-- KPI Progress table: tracks current progress for each user/account
CREATE TABLE IF NOT EXISTS kpi_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- null for account-level KPIs
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  current_value DECIMAL DEFAULT 0,
  target_value DECIMAL NOT NULL,
  progress_percentage DECIMAL GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 THEN (current_value / target_value * 100) 
      ELSE 0 
    END
  ) STORED,
  status TEXT CHECK (status IN ('on_track', 'at_risk', 'behind', 'exceeded')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kpi_definition_id, user_id, period_start)
);

-- Indexes for performance
CREATE INDEX idx_kpi_progress_definition ON kpi_progress(kpi_definition_id);
CREATE INDEX idx_kpi_progress_user ON kpi_progress(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_kpi_progress_period ON kpi_progress(period_start, period_end);

-- KPI History table: stores completed period results for trend analysis
CREATE TABLE IF NOT EXISTS kpi_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  final_value DECIMAL NOT NULL,
  target_value DECIMAL NOT NULL,
  achieved BOOLEAN NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_kpi_history_definition ON kpi_history(kpi_definition_id);
CREATE INDEX idx_kpi_history_user ON kpi_history(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_kpi_history_period ON kpi_history(period_start DESC);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_kpi_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER kpi_definitions_updated_at
  BEFORE UPDATE ON kpi_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_definitions_updated_at();

-- Function to calculate KPI status based on progress
CREATE OR REPLACE FUNCTION calculate_kpi_status(
  current_val DECIMAL,
  target_val DECIMAL,
  target_type_val TEXT,
  period_end_val DATE
)
RETURNS TEXT AS $$
DECLARE
  progress_pct DECIMAL;
  days_until_end INTEGER;
  expected_progress_pct DECIMAL;
BEGIN
  -- Calculate progress percentage
  IF target_val > 0 THEN
    progress_pct := (current_val / target_val) * 100;
  ELSE
    progress_pct := 0;
  END IF;

  -- Calculate days until period end
  days_until_end := period_end_val - CURRENT_DATE;

  -- For minimum targets
  IF target_type_val = 'minimum' THEN
    IF progress_pct >= 100 THEN
      RETURN 'exceeded';
    ELSIF days_until_end <= 0 THEN
      RETURN 'behind';
    ELSE
      -- Calculate expected progress based on time elapsed
      -- If we should be at 70% by now but we're at 50%, we're behind
      expected_progress_pct := 100.0 * (1 - (days_until_end::DECIMAL / EXTRACT(DAY FROM (period_end_val - (period_end_val - INTERVAL '1 month')))));
      
      IF progress_pct >= expected_progress_pct * 0.9 THEN
        RETURN 'on_track';
      ELSIF progress_pct >= expected_progress_pct * 0.7 THEN
        RETURN 'at_risk';
      ELSE
        RETURN 'behind';
      END IF;
    END IF;
  
  -- For maximum targets (less is better)
  ELSIF target_type_val = 'maximum' THEN
    IF current_val <= target_val THEN
      RETURN 'on_track';
    ELSE
      RETURN 'behind';
    END IF;
  
  -- For exact targets
  ELSE
    IF ABS(current_val - target_val) / target_val < 0.05 THEN
      RETURN 'on_track';
    ELSIF current_val > target_val THEN
      RETURN 'exceeded';
    ELSE
      RETURN 'behind';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate status when progress is updated
CREATE OR REPLACE FUNCTION update_kpi_progress_status()
RETURNS TRIGGER AS $$
DECLARE
  def_record RECORD;
BEGIN
  -- Get the KPI definition details
  SELECT target_type, period_end INTO def_record
  FROM kpi_definitions kd
  JOIN kpi_progress kp ON kp.kpi_definition_id = kd.id
  WHERE kp.id = NEW.id;

  -- Calculate and set status
  NEW.status := calculate_kpi_status(
    NEW.current_value,
    NEW.target_value,
    def_record.target_type,
    NEW.period_end
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kpi_progress_status_update
  BEFORE INSERT OR UPDATE ON kpi_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_progress_status();

-- Enable RLS
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_definitions
-- Users can view KPIs for their account
CREATE POLICY "Users can view KPIs for their account"
  ON kpi_definitions FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_access
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Moderators and admins can insert/update/delete KPIs
CREATE POLICY "Moderators can manage KPIs"
  ON kpi_definitions FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM account_access
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for kpi_progress
-- Users can view their own progress and account-level progress
CREATE POLICY "Users can view KPI progress"
  ON kpi_progress FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL -- account-level KPIs
    OR kpi_definition_id IN (
      SELECT kd.id FROM kpi_definitions kd
      JOIN account_access aa ON aa.account_id = kd.account_id
      WHERE aa.user_id = auth.uid() 
        AND aa.is_active = true
        AND aa.role IN ('admin', 'moderator')
    )
  );

-- Only system/moderators can update progress (done via API)
CREATE POLICY "System can update KPI progress"
  ON kpi_progress FOR ALL
  USING (
    kpi_definition_id IN (
      SELECT kd.id FROM kpi_definitions kd
      JOIN account_access aa ON aa.account_id = kd.account_id
      WHERE aa.user_id = auth.uid() 
        AND aa.is_active = true
        AND aa.role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for kpi_history
-- Users can view their own history and account-level history
CREATE POLICY "Users can view KPI history"
  ON kpi_history FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR kpi_definition_id IN (
      SELECT kd.id FROM kpi_definitions kd
      JOIN account_access aa ON aa.account_id = kd.account_id
      WHERE aa.user_id = auth.uid() 
        AND aa.is_active = true
        AND aa.role IN ('admin', 'moderator')
    )
  );

-- Comment the tables
COMMENT ON TABLE kpi_definitions IS 'Defines KPIs to track for users or accounts';
COMMENT ON TABLE kpi_progress IS 'Tracks current progress toward KPI targets for active periods';
COMMENT ON TABLE kpi_history IS 'Historical record of completed KPI periods';
COMMENT ON COLUMN kpi_definitions.metric_key IS 'Key from METRICS_REGISTRY (e.g., total_appointments, cash_collected)';
COMMENT ON COLUMN kpi_definitions.target_type IS 'Whether target is minimum (reach at least), maximum (stay under), or exact';
COMMENT ON COLUMN kpi_definitions.applies_to IS 'Whether KPI applies to individual users or account as a whole';
COMMENT ON COLUMN kpi_progress.status IS 'Auto-calculated: on_track, at_risk, behind, or exceeded';

