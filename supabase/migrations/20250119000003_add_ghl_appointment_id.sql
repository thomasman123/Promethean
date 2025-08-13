-- Add GHL appointment ID column to appointments table for better duplicate detection
-- This will help distinguish between truly duplicate appointments vs. different appointments
-- with same contact/time but different GHL IDs

-- Add ghl_appointment_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS ghl_appointment_id TEXT;

-- Add ghl_appointment_id column to discoveries table  
ALTER TABLE public.discoveries 
ADD COLUMN IF NOT EXISTS ghl_appointment_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_ghl_appointment_id 
ON public.appointments(ghl_appointment_id) 
WHERE ghl_appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discoveries_ghl_appointment_id 
ON public.discoveries(ghl_appointment_id) 
WHERE ghl_appointment_id IS NOT NULL;

-- Add unique constraints to prevent actual duplicates based on GHL ID
-- Use partial unique index to allow NULL values (for appointments without GHL IDs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_ghl_id 
ON public.appointments(account_id, ghl_appointment_id) 
WHERE ghl_appointment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_discoveries_unique_ghl_id 
ON public.discoveries(account_id, ghl_appointment_id) 
WHERE ghl_appointment_id IS NOT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN public.appointments.ghl_appointment_id IS 'GoHighLevel appointment ID for duplicate detection and linking back to GHL system';
COMMENT ON COLUMN public.discoveries.ghl_appointment_id IS 'GoHighLevel appointment ID for duplicate detection and linking back to GHL system'; 