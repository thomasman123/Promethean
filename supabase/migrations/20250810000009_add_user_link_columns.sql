-- Add user link columns to appointments and dials for backtracking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS setter_user_id UUID REFERENCES profiles(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sales_rep_user_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_appointments_setter_user_id ON appointments(setter_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_sales_rep_user_id ON appointments(sales_rep_user_id);

ALTER TABLE dials ADD COLUMN IF NOT EXISTS setter_user_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_dials_setter_user_id ON dials(setter_user_id); 