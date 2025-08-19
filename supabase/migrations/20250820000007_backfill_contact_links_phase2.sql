-- Phase 2: Backfill contact_id using GHL ID then email/phone fallback

-- Helper function: find contact by ghl_contact_id within account
CREATE OR REPLACE FUNCTION find_contact_by_ghl(p_account_id UUID, p_ghl_id TEXT)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  SELECT c.id INTO v_id
  FROM contacts c
  WHERE c.account_id = p_account_id AND c.ghl_contact_id = p_ghl_id
  ORDER BY c.updated_at DESC
  LIMIT 1;
  RETURN v_id;
END; $$ LANGUAGE plpgsql;

-- Helper function: find contact by email/phone within account
CREATE OR REPLACE FUNCTION find_contact_by_identity(p_account_id UUID, p_email TEXT, p_phone TEXT)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  SELECT c.id INTO v_id
  FROM contacts c
  WHERE c.account_id = p_account_id
    AND (
      (p_email IS NOT NULL AND c.email = p_email)
      OR (p_phone IS NOT NULL AND c.phone = p_phone)
    )
  ORDER BY c.date_updated DESC NULLS LAST, c.updated_at DESC
  LIMIT 1;
  RETURN v_id;
END; $$ LANGUAGE plpgsql;

-- Backfill appointments
UPDATE appointments a
SET contact_id = COALESCE(
  -- Prefer GHL ID from known metadata paths
  find_contact_by_ghl(a.account_id,
    COALESCE(
      a.metadata->'contact_enriched_data'->>'id',
      a.metadata->'original_webhook_payload'->'appointment'->>'contactId'
    )
  ),
  -- Else by email/phone
  find_contact_by_identity(a.account_id, a.email, a.phone)
)
WHERE a.contact_id IS NULL;

-- Backfill discoveries (no reliable metadata path in schema; use email/phone)
UPDATE discoveries d
SET contact_id = COALESCE(
  find_contact_by_identity(d.account_id, d.email, d.phone)
)
WHERE d.contact_id IS NULL;

-- Backfill dials
-- If dials lacks account_id, infer via email/phone from latest matching contacts
UPDATE dials dl
SET account_id = COALESCE(dl.account_id, (
  SELECT c.account_id FROM contacts c 
  WHERE (dl.email IS NOT NULL AND dl.email = c.email) OR (dl.phone IS NOT NULL AND dl.phone = c.phone)
  ORDER BY c.updated_at DESC
  LIMIT 1
))
WHERE dl.account_id IS NULL;

UPDATE dials dl
SET contact_id = COALESCE(
  find_contact_by_identity(dl.account_id, dl.email, dl.phone)
)
WHERE dl.contact_id IS NULL AND dl.account_id IS NOT NULL; 