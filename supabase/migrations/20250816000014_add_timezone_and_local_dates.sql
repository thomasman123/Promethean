-- Add business timezone to accounts (IANA TZ identifier)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS business_timezone TEXT NOT NULL DEFAULT 'UTC';

-- Helper function: compute local date/week/month given a timestamptz and timezone
CREATE OR REPLACE FUNCTION compute_local_dates(p_ts TIMESTAMPTZ, p_tz TEXT)
RETURNS TABLE(local_date DATE, local_week DATE, local_month DATE)
LANGUAGE SQL IMMUTABLE AS $$
  SELECT
    (p_ts AT TIME ZONE p_tz)::date AS local_date,
    DATE_TRUNC('week', (p_ts AT TIME ZONE p_tz))::date AS local_week,
    DATE_TRUNC('month', (p_ts AT TIME ZONE p_tz))::date AS local_month
$$;

-- Appointments: add local columns
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS local_date DATE,
  ADD COLUMN IF NOT EXISTS local_week DATE,
  ADD COLUMN IF NOT EXISTS local_month DATE;

-- Dials: add local columns
ALTER TABLE dials
  ADD COLUMN IF NOT EXISTS local_date DATE,
  ADD COLUMN IF NOT EXISTS local_week DATE,
  ADD COLUMN IF NOT EXISTS local_month DATE;

-- Discoveries: add local columns
ALTER TABLE discoveries
  ADD COLUMN IF NOT EXISTS local_date DATE,
  ADD COLUMN IF NOT EXISTS local_week DATE,
  ADD COLUMN IF NOT EXISTS local_month DATE;

-- Trigger function to set local dates for appointments (based on date_booked_for)
CREATE OR REPLACE FUNCTION set_local_dates_appointments()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_tz TEXT; v_rec record; BEGIN
  SELECT business_timezone INTO v_tz FROM accounts WHERE id = NEW.account_id; IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  SELECT * INTO v_rec FROM compute_local_dates(NEW.date_booked_for, v_tz);
  NEW.local_date := v_rec.local_date;
  NEW.local_week := v_rec.local_week;
  NEW.local_month := v_rec.local_month;
  RETURN NEW; END; $$;

-- Trigger function for dials (based on date_called)
CREATE OR REPLACE FUNCTION set_local_dates_dials()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_tz TEXT; v_rec record; BEGIN
  SELECT business_timezone INTO v_tz FROM accounts WHERE id = NEW.account_id; IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  SELECT * INTO v_rec FROM compute_local_dates(NEW.date_called, v_tz);
  NEW.local_date := v_rec.local_date;
  NEW.local_week := v_rec.local_week;
  NEW.local_month := v_rec.local_month;
  RETURN NEW; END; $$;

-- Trigger function for discoveries (based on date_booked_for)
CREATE OR REPLACE FUNCTION set_local_dates_discoveries()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_tz TEXT; v_rec record; BEGIN
  SELECT business_timezone INTO v_tz FROM accounts WHERE id = NEW.account_id; IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  SELECT * INTO v_rec FROM compute_local_dates(NEW.date_booked_for, v_tz);
  NEW.local_date := v_rec.local_date;
  NEW.local_week := v_rec.local_week;
  NEW.local_month := v_rec.local_month;
  RETURN NEW; END; $$;

-- Create triggers (before insert or update when time fields change)
DROP TRIGGER IF EXISTS trg_set_local_dates_appointments ON appointments;
CREATE TRIGGER trg_set_local_dates_appointments
BEFORE INSERT OR UPDATE OF date_booked_for, account_id ON appointments
FOR EACH ROW EXECUTE FUNCTION set_local_dates_appointments();

DROP TRIGGER IF EXISTS trg_set_local_dates_dials ON dials;
CREATE TRIGGER trg_set_local_dates_dials
BEFORE INSERT OR UPDATE OF date_called, account_id ON dials
FOR EACH ROW EXECUTE FUNCTION set_local_dates_dials();

DROP TRIGGER IF EXISTS trg_set_local_dates_discoveries ON discoveries;
CREATE TRIGGER trg_set_local_dates_discoveries
BEFORE INSERT OR UPDATE OF date_booked_for, account_id ON discoveries
FOR EACH ROW EXECUTE FUNCTION set_local_dates_discoveries();

-- Indexes for fast filtering/grouping
CREATE INDEX IF NOT EXISTS idx_appointments_local_date ON appointments(local_date);
CREATE INDEX IF NOT EXISTS idx_appointments_local_week ON appointments(local_week);
CREATE INDEX IF NOT EXISTS idx_appointments_local_month ON appointments(local_month);

CREATE INDEX IF NOT EXISTS idx_dials_local_date ON dials(local_date);
CREATE INDEX IF NOT EXISTS idx_dials_local_week ON dials(local_week);
CREATE INDEX IF NOT EXISTS idx_dials_local_month ON dials(local_month);

CREATE INDEX IF NOT EXISTS idx_discoveries_local_date ON discoveries(local_date);
CREATE INDEX IF NOT EXISTS idx_discoveries_local_week ON discoveries(local_week);
CREATE INDEX IF NOT EXISTS idx_discoveries_local_month ON discoveries(local_month); 