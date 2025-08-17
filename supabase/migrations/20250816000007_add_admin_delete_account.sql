-- Admin-only: completely delete an account after cleanup
create or replace function admin_delete_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure only admins can execute
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Forbidden';
  end if;

  -- Wipe all data
  perform admin_complete_account_cleanup(p_account_id);

  -- Remove remaining dependent rows
  delete from account_access where account_id = p_account_id;
  delete from dashboard_views where account_id = p_account_id;
  delete from account_utm_rules where account_id = p_account_id;
  delete from account_attribution_settings where account_id = p_account_id;

  -- Finally delete the account row
  delete from accounts where id = p_account_id;
end;
$$;

grant execute on function admin_delete_account(uuid) to authenticated; 