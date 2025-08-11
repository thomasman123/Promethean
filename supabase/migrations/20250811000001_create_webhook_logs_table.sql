-- Create webhook logs table to capture ALL incoming webhook requests
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Request metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    method TEXT NOT NULL DEFAULT 'POST',
    url TEXT,
    user_agent TEXT,
    ip_address TEXT,
    
    -- Headers
    headers JSONB,
    
    -- Request body
    raw_body TEXT,
    parsed_body JSONB,
    body_length INTEGER,
    
    -- Processing info
    request_id TEXT,
    processing_status TEXT DEFAULT 'received', -- received, processed, failed
    processing_error TEXT,
    response_status INTEGER,
    processing_duration_ms INTEGER,
    
    -- Webhook classification
    webhook_type TEXT, -- INSTALL, AppointmentCreate, etc.
    source TEXT DEFAULT 'ghl', -- ghl, stripe, etc.
    location_id TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_webhook_logs_timestamp ON webhook_logs(timestamp);
CREATE INDEX idx_webhook_logs_webhook_type ON webhook_logs(webhook_type);
CREATE INDEX idx_webhook_logs_location_id ON webhook_logs(location_id);
CREATE INDEX idx_webhook_logs_request_id ON webhook_logs(request_id);
CREATE INDEX idx_webhook_logs_processing_status ON webhook_logs(processing_status);
CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_logs (admin access only)
CREATE POLICY "Admins can view all webhook logs" ON public.webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add comments
COMMENT ON TABLE webhook_logs IS 'Comprehensive logging of all incoming webhook requests for debugging and monitoring';
COMMENT ON COLUMN webhook_logs.raw_body IS 'Raw request body as received (for debugging)';
COMMENT ON COLUMN webhook_logs.parsed_body IS 'Parsed JSON body if valid JSON';
COMMENT ON COLUMN webhook_logs.processing_status IS 'Status: received, processed, failed';
COMMENT ON COLUMN webhook_logs.webhook_type IS 'Type extracted from payload: INSTALL, AppointmentCreate, etc.';
COMMENT ON COLUMN webhook_logs.metadata IS 'Additional extracted metadata for analysis'; 