-- Refresh local_* values when an account's timezone changes

-- Function to refresh all local date columns for a given account
CREATE OR REPLACE FUNCTION refresh_local_dates_for_account(p_account_id UUID)
RETURNS VOID AS $$
BEGIN
	-- Appointments
	UPDATE appointments a
	SET 
		local_date = (SELECT local_date FROM compute_local_dates(a.date_booked_for, acc.business_timezone)),
		local_week = (SELECT local_week FROM compute_local_dates(a.date_booked_for, acc.business_timezone)),
		local_month = (SELECT local_month FROM compute_local_dates(a.date_booked_for, acc.business_timezone))
	FROM accounts acc
	WHERE acc.id = p_account_id AND a.account_id = acc.id;

	-- Dials
	UPDATE dials d
	SET 
		local_date = (SELECT local_date FROM compute_local_dates(d.date_called, acc.business_timezone)),
		local_week = (SELECT local_week FROM compute_local_dates(d.date_called, acc.business_timezone)),
		local_month = (SELECT local_month FROM compute_local_dates(d.date_called, acc.business_timezone))
	FROM accounts acc
	WHERE acc.id = p_account_id AND d.account_id = acc.id;

	-- Discoveries
	UPDATE discoveries di
	SET 
		local_date = (SELECT local_date FROM compute_local_dates(di.date_booked_for, acc.business_timezone)),
		local_week = (SELECT local_week FROM compute_local_dates(di.date_booked_for, acc.business_timezone)),
		local_month = (SELECT local_month FROM compute_local_dates(di.date_booked_for, acc.business_timezone))
	FROM accounts acc
	WHERE acc.id = p_account_id AND di.account_id = acc.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the refresh when accounts.business_timezone changes
CREATE OR REPLACE FUNCTION trg_on_accounts_timezone_change()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.business_timezone IS DISTINCT FROM OLD.business_timezone THEN
		PERFORM refresh_local_dates_for_account(NEW.id);
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_tz_change ON accounts;
CREATE TRIGGER trg_accounts_tz_change
AFTER UPDATE OF business_timezone ON accounts
FOR EACH ROW EXECUTE FUNCTION trg_on_accounts_timezone_change();

-- Composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_account_local_date ON appointments(account_id, local_date);
CREATE INDEX IF NOT EXISTS idx_appointments_account_local_week ON appointments(account_id, local_week);
CREATE INDEX IF NOT EXISTS idx_appointments_account_local_month ON appointments(account_id, local_month);

CREATE INDEX IF NOT EXISTS idx_dials_account_local_date ON dials(account_id, local_date);
CREATE INDEX IF NOT EXISTS idx_dials_account_local_week ON dials(account_id, local_week);
CREATE INDEX IF NOT EXISTS idx_dials_account_local_month ON dials(account_id, local_month);

CREATE INDEX IF NOT EXISTS idx_discoveries_account_local_date ON discoveries(account_id, local_date);
CREATE INDEX IF NOT EXISTS idx_discoveries_account_local_week ON discoveries(account_id, local_week);
CREATE INDEX IF NOT EXISTS idx_discoveries_account_local_month ON discoveries(account_id, local_month); 