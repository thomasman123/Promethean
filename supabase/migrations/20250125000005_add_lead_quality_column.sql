-- Add lead_quality column to discoveries table
-- This column is needed for the discovery outcome flow

-- Add lead quality rating column (1-5 scale)
ALTER TABLE discoveries
ADD COLUMN IF NOT EXISTS lead_quality INTEGER CHECK (lead_quality >= 1 AND lead_quality <= 5); 