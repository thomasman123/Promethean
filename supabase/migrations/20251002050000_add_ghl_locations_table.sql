-- Support multiple GHL location IDs per account
-- This allows one OAuth account to handle webhooks from multiple sub-locations

CREATE TABLE IF NOT EXISTS public.ghl_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  location_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure each location ID is unique globally
  CONSTRAINT unique_location_id UNIQUE (location_id),
  -- Ensure each account-location pair is unique
  CONSTRAINT unique_account_location UNIQUE (account_id, location_id)
);

-- Index for fast webhook lookups by location_id
CREATE INDEX IF NOT EXISTS idx_ghl_locations_location_id 
  ON public.ghl_locations(location_id);

-- Index for account queries
CREATE INDEX IF NOT EXISTS idx_ghl_locations_account_id 
  ON public.ghl_locations(account_id);

-- Add RLS policies
ALTER TABLE public.ghl_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ghl_locations for their accounts"
  ON public.ghl_locations
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id 
      FROM public.account_access 
      WHERE user_id = auth.uid()
    )
  );

-- Migrate existing location IDs from accounts table
INSERT INTO public.ghl_locations (account_id, location_id, is_primary)
SELECT id, ghl_location_id, true
FROM public.accounts
WHERE ghl_location_id IS NOT NULL
ON CONFLICT (location_id) DO NOTHING;

COMMENT ON TABLE public.ghl_locations IS 'Maps GHL location IDs to accounts, allowing one account to manage multiple locations';
COMMENT ON COLUMN public.ghl_locations.is_primary IS 'Indicates the primary/default location for the account';

