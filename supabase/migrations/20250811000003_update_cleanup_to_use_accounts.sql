-- Migrate cleanup functions to use accounts.* GHL columns instead of ghl_connections
-- Safe to run in Supabase SQL editor

-- Update: admin_clean_account_ghl_data(target_account_id uuid)
create or replace function admin_clean_account_ghl_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete calendar mappings for this account
  delete from calendar_mappings where account_id = target_account_id;

  -- Reset GHL-related columns on accounts and mark as disconnected
  update accounts
  set
    ghl_api_key = null,
    ghl_refresh_token = null,
    ghl_token_expires_at = null,
    ghl_location_id = null,
    ghl_auth_type = 'api_key',
    ghl_webhook_id = null,
    future_sync_enabled = false,
    last_future_sync_at = now()
  where id = target_account_id;
end;
$$;

-- Preserve execute grant
grant execute on function admin_clean_account_ghl_data(uuid) to authenticated;


-- Update: admin_complete_account_cleanup(target_account_id uuid)
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

  -- Delete all webhook logs for this account's location (if present)
  delete from webhook_logs 
  where location_id in (
    select ghl_location_id
    from accounts
    where id = target_account_id and ghl_location_id is not null
  );
  raise notice 'Deleted webhook logs for account: %', target_account_id;

  -- Reset GHL-related columns on accounts and mark as disconnected
  update accounts
  set
    ghl_api_key = null,
    ghl_refresh_token = null,
    ghl_token_expires_at = null,
    ghl_location_id = null,
    ghl_auth_type = 'api_key',
    ghl_webhook_id = null,
    future_sync_enabled = false,
    last_future_sync_at = now()
  where id = target_account_id;
  raise notice 'Reset account GHL columns for account: %', target_account_id;

  raise notice 'Complete cleanup finished for account: %', target_account_id;
end;
$$;

-- Preserve execute grant
grant execute on function admin_complete_account_cleanup(uuid) to authenticated;

-- Documentation: We have migrated cleanup logic to use accounts.* columns to represent GHL connection state.
-- The legacy table public.ghl_connections is no longer referenced by these functions. 