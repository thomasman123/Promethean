-- Wipe account activity data without disconnecting GHL or removing users/config
-- Deletes appointments, discoveries, dials, and related payments/logs

create or replace function admin_wipe_account_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise notice 'Wiping data for account: %', target_account_id;

  -- Payments first
  delete from appointment_payments
  where appointment_id in (select id from appointments where account_id = target_account_id);

  -- Core activity datasets
  delete from appointments where account_id = target_account_id;
  delete from discoveries where account_id = target_account_id;
  delete from dials where account_id = target_account_id;

  -- Webhook logs for the account's location (if any)
  delete from webhook_logs
  where location_id in (
    select ghl_location_id from accounts where id = target_account_id and ghl_location_id is not null
  );

  -- Intentionally preserve:
  -- - accounts row + GHL columns
  -- - calendar_mappings, attribution settings/rules, dashboard_views
  -- - users/profiles/team membership

  raise notice 'Wipe complete for account: %', target_account_id;
end;
$$;

grant execute on function admin_wipe_account_data(uuid) to authenticated; 