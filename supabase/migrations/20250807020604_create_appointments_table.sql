-- Create appointments table
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  setter VARCHAR(255) NOT NULL,
  sales_rep VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Call outcome enum
  call_outcome VARCHAR(20) CHECK (call_outcome IN ('Show', 'No Show', 'Reschedule', 'Cancel')),
  
  -- Show outcome enum
  show_outcome VARCHAR(20) CHECK (show_outcome IN ('won', 'lost', 'follow up')),
  
  -- Financial fields
  cash_collected DECIMAL(10,2) DEFAULT 0,
  total_sales_value DECIMAL(10,2) DEFAULT 0,
  
  -- Boolean flags
  pitched BOOLEAN DEFAULT false,
  watched_assets BOOLEAN DEFAULT false,
  
  -- Lead quality (1-5 rating)
  lead_quality INTEGER CHECK (lead_quality >= 1 AND lead_quality <= 5),
  
  -- Objections (stored as JSON for flexibility)
  objections JSONB DEFAULT '{}',
  
  -- Dates
  date_booked_for TIMESTAMP WITH TIME ZONE NOT NULL,
  date_booked TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_appointments_account_id ON appointments(account_id);
CREATE INDEX idx_appointments_setter ON appointments(setter);
CREATE INDEX idx_appointments_sales_rep ON appointments(sales_rep);
CREATE INDEX idx_appointments_call_outcome ON appointments(call_outcome);
CREATE INDEX idx_appointments_show_outcome ON appointments(show_outcome);
CREATE INDEX idx_appointments_date_booked_for ON appointments(date_booked_for);
CREATE INDEX idx_appointments_date_booked ON appointments(date_booked);
CREATE INDEX idx_appointments_lead_quality ON appointments(lead_quality);
