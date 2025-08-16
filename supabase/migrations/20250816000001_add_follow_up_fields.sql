-- Add follow-up scheduling and post-follow-up fields to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_watched_assets BOOLEAN;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_pitched BOOLEAN;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_show_outcome VARCHAR(20) CHECK (follow_up_show_outcome IN ('won', 'lost'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_cash_collected DECIMAL(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_total_sales_value DECIMAL(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_objections JSONB;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_lead_quality INTEGER CHECK (follow_up_lead_quality >= 1 AND follow_up_lead_quality <= 5);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_appointments_follow_up_at ON appointments(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_appointments_follow_up_show_outcome ON appointments(follow_up_show_outcome); 