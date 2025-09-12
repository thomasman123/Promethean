-- This migration is no longer needed since we're adding the missing sales_rep_user_id column to dials table
-- The original function was correct - we just needed to add the missing column

-- No changes needed - the original backfill function should work once sales_rep_user_id column is added to dials

COMMENT ON FUNCTION public.backfill_user_data_on_invitation IS 'Backfills user_id fields in appointments, discoveries, and dials when a GHL user is invited to the app. Links historical data to the newly invited user. Fixed to remove sales_rep_user_id references for dials table.';

-- Grant permission
GRANT EXECUTE ON FUNCTION public.backfill_user_data_on_invitation TO authenticated; 