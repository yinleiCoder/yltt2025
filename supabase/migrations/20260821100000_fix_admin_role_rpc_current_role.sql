-- Avoid PostgreSQL's CURRENT_ROLE special expression colliding with the
-- PL/pgSQL variable used while comparing the target role.
create or replace function public.admin_change_user_role(
  target_profile_id uuid,
  next_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := (select auth.uid());
  existing_role public.user_role;
begin
  if current_actor_id is null or not (select private.is_admin()) then
    raise exception 'Administrator access is required';
  end if;

  if current_actor_id = target_profile_id then
    raise exception 'Administrators cannot change their own role';
  end if;

  -- Serialize every role change so two concurrent administrator demotions
  -- cannot each observe the same pre-change administrator count.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('public.admin_change_user_role')
  );

  -- The caller might have waited while another administrator changed roles.
  -- Recheck before this SECURITY DEFINER function reads or writes profiles.
  if current_actor_id is null or not (select private.is_admin()) then
    raise exception 'Administrator access is required';
  end if;

  select role into existing_role
  from public.profiles
  where id = target_profile_id
  for update;

  if not found then
    raise exception 'Target profile was not found';
  end if;

  if existing_role = next_role then
    return;
  end if;

  if existing_role = 'admin'
    and next_role = 'user'
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'The last administrator cannot be demoted';
  end if;

  perform set_config('app.allow_role_change', 'true', true);
  update public.profiles
  set role = next_role
  where id = target_profile_id;

  insert into public.role_audit_logs (actor_id, target_id, previous_role, next_role)
  values (current_actor_id, target_profile_id, existing_role, next_role);
end;
$$;

revoke all on function public.admin_change_user_role(uuid, public.user_role)
  from anon, service_role, public;

grant execute on function public.admin_change_user_role(uuid, public.user_role)
  to authenticated;
