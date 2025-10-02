-- Add snapshot columns for dial contact details captured during webhooks

ALTER TABLE public.dials
  ADD COLUMN IF NOT EXISTS contact_email_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS contact_name_snapshot TEXT;

COMMENT ON COLUMN public.dials.contact_email_snapshot IS 'Email captured from webhook at dial creation time';
COMMENT ON COLUMN public.dials.contact_phone_snapshot IS 'Phone captured from webhook at dial creation time';
COMMENT ON COLUMN public.dials.contact_name_snapshot IS 'Name captured from webhook at dial creation time';

-- Add indexes for efficient querying by snapshot fields (only when not null)
CREATE INDEX IF NOT EXISTS idx_dials_contact_email_snapshot 
  ON public.dials(contact_email_snapshot) 
  WHERE contact_email_snapshot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dials_contact_phone_snapshot 
  ON public.dials(contact_phone_snapshot) 
  WHERE contact_phone_snapshot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dials_contact_name_snapshot 
  ON public.dials(contact_name_snapshot) 
  WHERE contact_name_snapshot IS NOT NULL;

