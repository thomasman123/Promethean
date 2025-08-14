-- Add user ID columns to discoveries table for proper RLS and data linking
-- This enables the same pattern as appointments for user-specific data access

-- Add setter_user_id column (who can edit the discovery outcome)
ALTER TABLE discoveries 
ADD COLUMN setter_user_id UUID REFERENCES profiles(id);

-- Add sales_rep_user_id column (for future use)
ALTER TABLE discoveries 
ADD COLUMN sales_rep_user_id UUID REFERENCES profiles(id);

-- Create indexes for performance
CREATE INDEX idx_discoveries_setter_user_id ON discoveries(setter_user_id);
CREATE INDEX idx_discoveries_sales_rep_user_id ON discoveries(sales_rep_user_id);

-- Add a quality rating column similar to appointments (for future use)
ALTER TABLE discoveries
ADD COLUMN lead_quality INTEGER CHECK (lead_quality >= 1 AND lead_quality <= 5);

-- Create RLS policies for discoveries
-- Users can read discoveries where they are the setter
CREATE POLICY "Users can read own discoveries" ON discoveries
    FOR SELECT USING (setter_user_id = auth.uid());

-- Users can update discoveries where they are the setter
CREATE POLICY "Users can update own discoveries" ON discoveries
    FOR UPDATE USING (setter_user_id = auth.uid());

-- Users can insert discoveries
CREATE POLICY "Users can insert discoveries" ON discoveries
    FOR INSERT WITH CHECK (setter_user_id = auth.uid()); 