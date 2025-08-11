-- Clean up GHL-related data for an account
-- This function is SECURITY DEFINER to bypass RLS safely
-- It resets the connection and deletes calendar mappings

create or replace function admin_clean_account_ghl_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete calendar mappings for this account
  delete from calendar_mappings where account_id = target_account_id;

  -- Reset connection tokens and mark disconnected
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
end;
$$;

-- Allow authenticated role to invoke this function (runs as definer)
grant execute on function admin_clean_account_ghl_data(uuid) to authenticated; 