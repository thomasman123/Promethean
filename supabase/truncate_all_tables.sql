-- Truncate all user tables in the public schema without dropping them
-- Restarts identities and cascades to dependent tables
-- Safe to run in Supabase SQL editor (no superuser-only settings)

DO $$
DECLARE
  r RECORD;
BEGIN
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
END $$; 