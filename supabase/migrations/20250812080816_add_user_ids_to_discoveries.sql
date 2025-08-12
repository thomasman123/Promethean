-- Add user ID columns to discoveries table for proper linking to profiles
-- This allows us to link discoveries to actual user accounts instead of just using names

-- Add setter_user_id column
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS setter_user_id UUID REFERENCES profiles(id);

-- Add sales_rep_user_id column  
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS sales_rep_user_id UUID REFERENCES profiles(id);

-- Create indexes for the new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_discoveries_setter_user_id ON discoveries(setter_user_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_sales_rep_user_id ON discoveries(sales_rep_user_id);

-- Add comments for documentation
COMMENT ON COLUMN discoveries.setter_user_id IS 'References the user profile of the setter who conducted the discovery call';
COMMENT ON COLUMN discoveries.sales_rep_user_id IS 'References the user profile of the sales rep assigned to this discovery';
