-- Create GHL connections table
CREATE TABLE IF NOT EXISTS public.ghl_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    
    -- OAuth data
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    ghl_location_id TEXT,
    ghl_company_id TEXT,
    
    -- Connection status
    is_connected BOOLEAN DEFAULT FALSE,
    connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(account_id) -- One connection per account
);

-- Enable RLS
ALTER TABLE public.ghl_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for ghl_connections
CREATE POLICY "Users can view GHL connections for accounts they have access to" ON public.ghl_connections
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "Moderators and admins can manage GHL connections" ON public.ghl_connections
    FOR ALL USING (
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator') 
            AND is_active = true
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ghl_connections_updated_at
    BEFORE UPDATE ON public.ghl_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_ghl_connections_account_id ON public.ghl_connections(account_id);
CREATE INDEX idx_ghl_connections_status ON public.ghl_connections(connection_status);
CREATE INDEX idx_ghl_connections_ghl_location_id ON public.ghl_connections(ghl_location_id); 