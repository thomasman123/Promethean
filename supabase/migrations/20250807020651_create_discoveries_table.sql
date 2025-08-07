-- Create discoveries table for tracking discovery calls
CREATE TABLE discoveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  setter VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Dates
  date_booked_for TIMESTAMP WITH TIME ZONE NOT NULL,
  date_booked TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Sales rep assigned
  sales_rep VARCHAR(255),
  
  -- Call outcome enum
  call_outcome VARCHAR(20) CHECK (call_outcome IN ('show', 'no show', 'reschedule', 'cancel')),
  
  -- Show outcome enum  
  show_outcome VARCHAR(20) CHECK (show_outcome IN ('booked', 'not booked')),
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add RLS
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_discoveries_updated_at BEFORE UPDATE ON discoveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_discoveries_account_id ON discoveries(account_id);
CREATE INDEX idx_discoveries_setter ON discoveries(setter);
CREATE INDEX idx_discoveries_sales_rep ON discoveries(sales_rep);
CREATE INDEX idx_discoveries_call_outcome ON discoveries(call_outcome);
CREATE INDEX idx_discoveries_show_outcome ON discoveries(show_outcome);
CREATE INDEX idx_discoveries_date_booked_for ON discoveries(date_booked_for);
CREATE INDEX idx_discoveries_date_booked ON discoveries(date_booked);
CREATE INDEX idx_discoveries_contact_name ON discoveries(contact_name);
