-- Drop the legacy ghl_connections table since all functionality has been migrated to accounts.* columns
-- This table is no longer used in application code or cleanup functions

-- Drop all policies first
DROP POLICY IF EXISTS "Users can view GHL connections for accounts they have access to" ON public.ghl_connections;
DROP POLICY IF EXISTS "Allow OAuth callback to create connections" ON public.ghl_connections;
DROP POLICY IF EXISTS "Users can update GHL connections for accounts they have access to" ON public.ghl_connections;
DROP POLICY IF EXISTS "Users can delete GHL connections for accounts they have access to" ON public.ghl_connections;
DROP POLICY IF EXISTS "Moderators and admins can manage GHL connections" ON public.ghl_connections;

-- Drop triggers
DROP TRIGGER IF EXISTS update_ghl_connections_updated_at ON public.ghl_connections;

-- Drop indexes
DROP INDEX IF EXISTS idx_ghl_connections_account_id;
DROP INDEX IF EXISTS idx_ghl_connections_status;
DROP INDEX IF EXISTS idx_ghl_connections_ghl_location_id;

-- Drop the table
DROP TABLE IF EXISTS public.ghl_connections;

-- Add comment documenting the migration
COMMENT ON SCHEMA public IS 'GHL connections functionality migrated to accounts table columns as of 2025-01-11'; 