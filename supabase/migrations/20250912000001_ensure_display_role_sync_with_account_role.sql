-- Ensure display_role is always synchronized with account_role changes
-- This migration creates a trigger to handle any future synchronization needs

-- First, let's create a function that can be used to refresh any cached display_role data
CREATE OR REPLACE FUNCTION refresh_display_role_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- For now, since display_role is calculated in the view, this is mostly future-proofing
  -- If we ever add cached display_role columns to tables, this trigger will handle updates
  
  -- Log the role change for debugging
  RAISE NOTICE 'Account role changed for user % in account %: % -> %', 
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.account_id, OLD.account_id),
    OLD.role,
    NEW.role;
    
  -- The team_members view automatically recalculates display_role based on account_role
  -- No additional action needed since it's a computed column in the view
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on account_access table to handle role changes
DROP TRIGGER IF EXISTS sync_display_role_on_account_role_change ON account_access;

CREATE TRIGGER sync_display_role_on_account_role_change
  AFTER INSERT OR UPDATE OF role ON account_access
  FOR EACH ROW
  EXECUTE FUNCTION refresh_display_role_cache();

-- Verify the current display_role calculation logic is correct
-- This should match the logic in the team_members view
DO $$
DECLARE
  test_record RECORD;
  expected_display_role TEXT;
  actual_display_role TEXT;
  mismatch_count INTEGER := 0;
BEGIN
  -- Check if display_role calculation is consistent
  FOR test_record IN 
    SELECT 
      tm.user_id,
      tm.account_id,
      tm.account_role,
      tm.display_role,
      CASE 
        WHEN tm.account_role IN ('sales_rep', 'moderator', 'admin') THEN 'rep'
        WHEN tm.account_role = 'setter' THEN 'setter'
        ELSE 'inactive'
      END as expected_display_role
    FROM team_members tm
    LIMIT 10 -- Just check a sample
  LOOP
    IF test_record.display_role != test_record.expected_display_role THEN
      mismatch_count := mismatch_count + 1;
      RAISE NOTICE 'Display role mismatch for user %: expected %, got %', 
        test_record.user_id, 
        test_record.expected_display_role, 
        test_record.display_role;
    END IF;
  END LOOP;
  
  IF mismatch_count = 0 THEN
    RAISE NOTICE 'Display role calculation is working correctly - all sampled records match expected values';
  ELSE
    RAISE NOTICE 'Found % display role mismatches in sample', mismatch_count;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION refresh_display_role_cache() IS 'Ensures display_role stays synchronized with account_role changes. Currently logs changes since display_role is computed in views.';
COMMENT ON TRIGGER sync_display_role_on_account_role_change ON account_access IS 'Automatically handles display_role synchronization when account roles change';

-- Create a helper function to get the display role for a given account role
CREATE OR REPLACE FUNCTION get_display_role(account_role user_role)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN account_role IN ('sales_rep', 'moderator', 'admin') THEN 'rep'
    WHEN account_role = 'setter' THEN 'setter'
    ELSE 'inactive'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_display_role(user_role) IS 'Converts account_role to display_role using the standard business logic'; 