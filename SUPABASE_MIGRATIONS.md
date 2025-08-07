# Supabase Database Migrations

Run these SQL commands in the Supabase SQL Editor in the following order:

## 1. Accounts Table
```sql
-- Create accounts table for storing business account information
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Add RLS (Row Level Security)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_accounts_name ON accounts(name);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);
CREATE INDEX idx_accounts_created_at ON accounts(created_at);
```

## 2. Appointments Table
```sql
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
```

## 3. Dials Table
```sql
-- Create dials table for tracking phone call attempts
CREATE TABLE dials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setter VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  
  -- Call duration in seconds
  duration INTEGER DEFAULT 0,
  
  -- Boolean flags
  answered BOOLEAN DEFAULT false,
  meaningful_conversation BOOLEAN DEFAULT false,
  
  -- Call recording link
  call_recording_link TEXT,
  
  -- Date called
  date_called TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add RLS
ALTER TABLE dials ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_dials_updated_at BEFORE UPDATE ON dials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_dials_setter ON dials(setter);
CREATE INDEX idx_dials_phone ON dials(phone);
CREATE INDEX idx_dials_answered ON dials(answered);
CREATE INDEX idx_dials_meaningful_conversation ON dials(meaningful_conversation);
CREATE INDEX idx_dials_date_called ON dials(date_called);
CREATE INDEX idx_dials_contact_name ON dials(contact_name);
```

## 4. Discoveries Table
```sql
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
```

## Instructions
1. Go to your Supabase project: https://supabase.com/dashboard/project/encqrassymusdmwduhzi
2. Navigate to SQL Editor
3. Run each SQL block above in order (1-4)
4. Verify tables are created in the Table Editor 