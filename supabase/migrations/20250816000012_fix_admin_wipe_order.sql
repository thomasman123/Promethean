-- Adjust wipe order to avoid FK violations and null dials FK first
create or replace function admin_wipe_account_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise notice 'Wiping data for account (safe order): %', target_account_id;

  -- 1) Null out dial links to appointments
  update dials
  set booked = false, booked_appointment_id = null
  where account_id = target_account_id;

  -- 2) Delete payments referencing appointments
  delete from appointment_payments
  where appointment_id in (select id from appointments where account_id = target_account_id);

  -- 3) Delete dials
  delete from dials where account_id = target_account_id;

  -- 4) Clear discovery<->appointment links
  update discoveries set linked_appointment_id = null
  where account_id = target_account_id;
  update appointments set linked_discovery_id = null
  where account_id = target_account_id;

  -- 5) Delete appointments and discoveries
  delete from appointments where account_id = target_account_id;
  delete from discoveries where account_id = target_account_id;

  -- 6) Webhook logs (by account's location)
  delete from webhook_logs
  where location_id in (
    select ghl_location_id from accounts where id = target_account_id and ghl_location_id is not null
  );

  raise notice 'Wipe complete (safe order) for account: %', target_account_id;
end;
$$;

grant execute on function admin_wipe_account_data(uuid) to authenticated; 