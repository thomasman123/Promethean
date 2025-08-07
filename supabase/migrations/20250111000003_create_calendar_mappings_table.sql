-- Create calendar mappings table
CREATE TABLE IF NOT EXISTS public.calendar_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    
    -- GHL calendar info
    ghl_calendar_id TEXT NOT NULL,
    calendar_name TEXT NOT NULL,
    calendar_description TEXT,
    
    -- Mapping configuration
    is_enabled BOOLEAN DEFAULT FALSE,
    target_table TEXT CHECK (target_table IN ('appointments', 'discoveries')) DEFAULT 'appointments',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(account_id, ghl_calendar_id) -- One mapping per calendar per account
);

-- Enable RLS
ALTER TABLE public.calendar_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar_mappings
CREATE POLICY "Users can view calendar mappings for accounts they have access to" ON public.calendar_mappings
    FOR SELECT USING (
        account_id IN (
            SELECT account_id 
            FROM public.account_access 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "Moderators and admins can manage calendar mappings" ON public.calendar_mappings
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
CREATE TRIGGER update_calendar_mappings_updated_at
    BEFORE UPDATE ON public.calendar_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_calendar_mappings_account_id ON public.calendar_mappings(account_id);
CREATE INDEX idx_calendar_mappings_ghl_calendar_id ON public.calendar_mappings(ghl_calendar_id);
CREATE INDEX idx_calendar_mappings_enabled ON public.calendar_mappings(is_enabled) WHERE is_enabled = true; 