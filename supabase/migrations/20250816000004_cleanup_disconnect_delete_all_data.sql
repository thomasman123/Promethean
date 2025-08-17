-- Ensure complete cleanup removes all account data except users and core account row
-- Use with caution; irreversible

create or replace function admin_complete_account_cleanup(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise notice 'Starting complete cleanup for account: %', target_account_id;

  -- Delete appointment payments first (may not have FK cascade)
  delete from appointment_payments
  where appointment_id in (select id from appointments where account_id = target_account_id);
  raise notice 'Deleted appointment payments';

  -- Core datasets
  delete from appointments where account_id = target_account_id;
  delete from discoveries where account_id = target_account_id;
  delete from dials where account_id = target_account_id;
  delete from calendar_mappings where account_id = target_account_id;
  raise notice 'Deleted core datasets';

  -- Attribution and rules/config tied to account
  delete from utm_attribution_mappings where account_id = target_account_id;
  delete from account_utm_rules where account_id = target_account_id;
  delete from account_attribution_settings where account_id = target_account_id;
  raise notice 'Deleted attribution config';

  -- Dashboard saved views
  delete from dashboard_views where account_id = target_account_id;
  raise notice 'Deleted dashboard views';

  -- Webhook logs by location if available
  delete from webhook_logs
  where location_id in (
    select ghl_location_id from accounts where id = target_account_id and ghl_location_id is not null
  );
  raise notice 'Deleted webhook logs';

  -- Reset GHL connection columns on accounts (do not delete account/users)
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
  raise notice 'Reset account GHL columns';

  raise notice 'Complete cleanup finished for account: %', target_account_id;
end;
$$;

-- Minimal wrapper delegates to complete cleanup
create or replace function admin_clean_account_ghl_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform admin_complete_account_cleanup(target_account_id);
end;
$$;

grant execute on function admin_complete_account_cleanup(uuid) to authenticated;
grant execute on function admin_clean_account_ghl_data(uuid) to authenticated; 