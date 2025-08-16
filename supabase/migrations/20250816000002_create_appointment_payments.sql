-- Create table to track manual payment plans/payments per appointment
CREATE TABLE IF NOT EXISTS appointment_payments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
	payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
	amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
	paid BOOLEAN NOT NULL DEFAULT false,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment_id ON appointment_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_payment_date ON appointment_payments(payment_date);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_appointment_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_appointment_payments_updated_at ON appointment_payments;
CREATE TRIGGER trg_update_appointment_payments_updated_at
	BEFORE UPDATE ON appointment_payments
	FOR EACH ROW EXECUTE FUNCTION update_appointment_payments_updated_at();

-- Enable RLS
ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;

-- Policies: allow sales_rep_user_id assigned to the appointment to manage rows
DROP POLICY IF EXISTS sel_appointment_payments ON appointment_payments;
CREATE POLICY sel_appointment_payments ON appointment_payments
	FOR SELECT USING (
		EXISTS (
			SELECT 1 FROM appointments a
			WHERE a.id = appointment_payments.appointment_id
			AND (a.sales_rep_user_id = auth.uid())
		)
	);

DROP POLICY IF EXISTS ins_appointment_payments ON appointment_payments;
CREATE POLICY ins_appointment_payments ON appointment_payments
	FOR INSERT WITH CHECK (
		EXISTS (
			SELECT 1 FROM appointments a
			WHERE a.id = appointment_id
			AND (a.sales_rep_user_id = auth.uid())
		)
	);

DROP POLICY IF EXISTS upd_appointment_payments ON appointment_payments;
CREATE POLICY upd_appointment_payments ON appointment_payments
	FOR UPDATE USING (
		EXISTS (
			SELECT 1 FROM appointments a
			WHERE a.id = appointment_payments.appointment_id
			AND (a.sales_rep_user_id = auth.uid())
		)
	);

DROP POLICY IF EXISTS del_appointment_payments ON appointment_payments;
CREATE POLICY del_appointment_payments ON appointment_payments
	FOR DELETE USING (
		EXISTS (
			SELECT 1 FROM appointments a
			WHERE a.id = appointment_payments.appointment_id
			AND (a.sales_rep_user_id = auth.uid())
		)
	); 