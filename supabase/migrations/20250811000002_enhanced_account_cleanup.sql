-- Enhanced cleanup function to remove ALL account-related data
-- This function removes all data associated with an account when disconnecting
-- Use with EXTREME caution - this is irreversible

create or replace function admin_complete_account_cleanup(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Log the cleanup operation
  raise notice 'Starting complete cleanup for account: %', target_account_id;

  -- Delete all appointments for this account
  delete from appointments where account_id = target_account_id;
  raise notice 'Deleted appointments for account: %', target_account_id;

  -- Delete all discoveries for this account
  delete from discoveries where account_id = target_account_id;
  raise notice 'Deleted discoveries for account: %', target_account_id;

  -- Delete all dials for this account
  delete from dials where account_id = target_account_id;
  raise notice 'Deleted dials for account: %', target_account_id;

  -- Delete all calendar mappings for this account
  delete from calendar_mappings where account_id = target_account_id;
  raise notice 'Deleted calendar mappings for account: %', target_account_id;

  -- Delete all webhook logs for this account's locations
  delete from webhook_logs 
  where location_id in (
    select ghl_location_id 
    from ghl_connections 
    where account_id = target_account_id
  );
  raise notice 'Deleted webhook logs for account: %', target_account_id;

  -- Reset and disconnect GHL connection
  update ghl_connections
  set
    access_token = null,
    refresh_token = null,
    token_expires_at = null,
    ghl_location_id = null,
    ghl_company_id = null,
    is_connected = false,
    connection_status = 'disconnected',
    error_message = null,
    last_sync_at = now()
  where account_id = target_account_id;
  raise notice 'Reset GHL connection for account: %', target_account_id;

  -- Note: We do NOT delete the account itself or user profiles
  -- Those require separate admin action if needed

  raise notice 'Complete cleanup finished for account: %', target_account_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function admin_complete_account_cleanup(uuid) to authenticated;

-- Add comments
comment on function admin_complete_account_cleanup(uuid) is 
'Completely removes ALL data associated with an account including appointments, discoveries, dials, calendar mappings, webhook logs, and resets GHL connection. Use with extreme caution - this is irreversible.';

-- Also update the original function to use the new comprehensive cleanup
create or replace function admin_clean_account_ghl_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Use the comprehensive cleanup function
  perform admin_complete_account_cleanup(target_account_id);
end;
$$; 