-- Create attribution_sessions table for internal tracking
CREATE TABLE attribution_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    fingerprint_id TEXT,
    
    -- URL and referrer data
    landing_url TEXT,
    referrer_url TEXT,
    page_title TEXT,
    
    -- UTM parameters (captured from URL)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    utm_id TEXT,
    
    -- Meta-specific parameters
    fbclid TEXT,
    fbp TEXT,
    fbc TEXT,
    
    -- Meta ad IDs (from UTM or reverse lookup)
    meta_campaign_id TEXT,
    meta_ad_set_id TEXT,
    meta_ad_id TEXT,
    
    -- Meta ad details (from API lookup)
    meta_campaign_name TEXT,
    meta_ad_set_name TEXT,
    meta_ad_name TEXT,
    
    -- Browser and device data
    user_agent TEXT,
    ip_address INET,
    screen_resolution TEXT,
    timezone_offset INTEGER,
    language TEXT,
    
    -- Attribution quality and source
    attribution_quality TEXT CHECK (attribution_quality IN ('perfect', 'high', 'medium', 'low')) DEFAULT 'medium',
    attribution_method TEXT CHECK (attribution_method IN ('utm_direct', 'fbclid_lookup', 'pixel_bridge', 'fingerprint_match')) DEFAULT 'utm_direct',
    
    -- Timestamps
    first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
    
    -- Linking
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    linked_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    raw_attribution_data JSONB,
    meta_pixel_data JSONB,
    additional_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE attribution_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to view sessions linked to their accounts
CREATE POLICY "Users can view attribution sessions for their contacts" ON attribution_sessions
    FOR SELECT USING (
        contact_id IN (
            SELECT c.id FROM contacts c
            JOIN account_access aa ON c.account_id = aa.account_id
            WHERE aa.user_id = auth.uid() AND aa.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow system to manage all attribution sessions
CREATE POLICY "System can manage attribution sessions" ON attribution_sessions
    FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX idx_attribution_sessions_session_id ON attribution_sessions(session_id);
CREATE INDEX idx_attribution_sessions_fingerprint_id ON attribution_sessions(fingerprint_id);
CREATE INDEX idx_attribution_sessions_fbclid ON attribution_sessions(fbclid);
CREATE INDEX idx_attribution_sessions_contact_id ON attribution_sessions(contact_id);
CREATE INDEX idx_attribution_sessions_expires_at ON attribution_sessions(expires_at);
CREATE INDEX idx_attribution_sessions_meta_campaign_id ON attribution_sessions(meta_campaign_id);
CREATE INDEX idx_attribution_sessions_meta_ad_id ON attribution_sessions(meta_ad_id);

-- Add table comments
COMMENT ON TABLE attribution_sessions IS 'Internal attribution tracking sessions for 100% accurate contact-to-ad attribution';
COMMENT ON COLUMN attribution_sessions.session_id IS 'Unique session identifier for tracking user journey';
COMMENT ON COLUMN attribution_sessions.fingerprint_id IS 'Browser fingerprint for cross-session tracking';
COMMENT ON COLUMN attribution_sessions.attribution_quality IS 'Quality score of attribution data (perfect/high/medium/low)';
COMMENT ON COLUMN attribution_sessions.attribution_method IS 'Method used to determine attribution (utm_direct/fbclid_lookup/pixel_bridge/fingerprint_match)'; 