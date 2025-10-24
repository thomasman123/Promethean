-- Add ghl_message_id to dials table for idempotent backfilling
-- This allows us to track which GHL message ID created each dial and prevent duplicates

ALTER TABLE public.dials
  ADD COLUMN IF NOT EXISTS ghl_message_id TEXT;

-- Create unique index to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_dials_ghl_message_id 
  ON public.dials(account_id, ghl_message_id) 
  WHERE ghl_message_id IS NOT NULL;

COMMENT ON COLUMN public.dials.ghl_message_id IS 'GHL message ID for idempotent backfilling and duplicate prevention';

