-- Add attribution fields to dials mirroring appointments/discoveries
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_source TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_utm_source TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_utm_medium TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_utm_campaign TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_utm_content TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_referrer TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_gclid TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_fbclid TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS contact_campaign_id TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS last_attribution_source JSONB;

ALTER TABLE dials ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS utm_id TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS landing_url TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS session_source TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS medium_id TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS attribution_data JSONB;
ALTER TABLE dials ADD COLUMN IF NOT EXISTS last_attribution_data JSONB;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_dials_contact_utm ON dials(utm_source, utm_medium, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_dials_session_source ON dials(session_source);
CREATE INDEX IF NOT EXISTS idx_dials_fbclid ON dials(fbclid); 