-- Add call_sid column to discoveries table for session linking
ALTER TABLE public.discoveries
ADD COLUMN IF NOT EXISTS call_sid text;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_discoveries_call_sid ON public.discoveries(call_sid); 