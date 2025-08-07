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
