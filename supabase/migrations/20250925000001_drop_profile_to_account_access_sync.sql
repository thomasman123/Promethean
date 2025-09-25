-- Stop global cascades: remove profile → account_access role sync
-- This makes account_access the per-account source of truth.

DO $$ BEGIN
  -- Drop trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'sync_profile_role_trigger'
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.profiles';
  END IF;
END $$;

-- Drop the trigger function; safe if unused elsewhere
DROP FUNCTION IF EXISTS public.sync_profile_role_to_account_access();

-- Note: We intentionally keep account_access → profiles sync (primary account only)
-- via sync_account_access_role_to_profile to inform profile role for display. 