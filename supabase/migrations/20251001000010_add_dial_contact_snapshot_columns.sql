-- Add snapshot columns for dial contact details captured during webhooks

ALTER TABLE public.dials
  ADD COLUMN IF NOT EXISTS contact_email_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS contact_name_snapshot TEXT;

COMMENT ON COLUMN public.dials.contact_email_snapshot IS 'Email captured from webhook at dial creation time';
COMMENT ON COLUMN public.dials.contact_phone_snapshot IS 'Phone captured from webhook at dial creation time';
COMMENT ON COLUMN public.dials.contact_name_snapshot IS 'Name captured from webhook at dial creation time';

