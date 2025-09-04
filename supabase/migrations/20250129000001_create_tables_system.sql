-- Create tables for data view page
CREATE TABLE IF NOT EXISTS public.data_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  columns JSONB DEFAULT '[]'::jsonb, -- Array of column configurations
  filters JSONB DEFAULT '{}'::jsonb, -- Role filters and other filters
  sort_config JSONB DEFAULT '{}'::jsonb, -- Sorting configuration
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(account_id, name)
);

-- Add RLS policies for data_tables
ALTER TABLE public.data_tables ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tables for their account
CREATE POLICY "Users can view data tables for their account" ON public.data_tables
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create tables for their account
CREATE POLICY "Users can create data tables for their account" ON public.data_tables
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update tables for their account
CREATE POLICY "Users can update data tables for their account" ON public.data_tables
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete tables for their account
CREATE POLICY "Users can delete data tables for their account" ON public.data_tables
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_data_tables_updated_at
  BEFORE UPDATE ON public.data_tables
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_data_tables_account_id ON public.data_tables(account_id);
CREATE INDEX idx_data_tables_created_at ON public.data_tables(created_at DESC); 