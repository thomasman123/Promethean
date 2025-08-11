-- Truncate all user tables in the public schema without dropping them
-- Restarts identities and cascades to dependent tables
-- Note: This runs as a privileged user (e.g., via Supabase CLI local dev). For remote DBs, ensure your role has privileges.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Temporarily relax trigger checks to avoid FK/trigger issues
  EXECUTE 'SET session_replication_role = replica';

  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      -- Exclude any known meta/config tables here if needed
      AND tablename NOT IN (
        'spatial_ref_sys' -- if PostGIS is installed; harmless if not present
      )
  LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;

  -- Restore normal trigger behavior
  EXECUTE 'SET session_replication_role = DEFAULT';
END $$; 