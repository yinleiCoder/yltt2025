alter table public.profiles
  add column if not exists email text,
  add column if not exists public_email boolean not null default false;

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where auth_user.id = profile.id and profile.email is null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    lower(new.email),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 80), ''),
    case
      when exists (
        select 1 from public.admin_email_allowlist where email = lower(new.email)
      ) then 'admin'::public.user_role
      else 'user'::public.user_role
    end
  );
  return new;
end;
$$;

drop function if exists public.get_public_profiles(uuid[]);

create function public.get_public_profiles(requested_profile_ids uuid[])
returns table (
  id uuid,
  avatar_url text,
  display_name text,
  email text,
  gender public.profile_gender,
  real_name text,
  phone text,
  address text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if cardinality(coalesce(requested_profile_ids, '{}'::uuid[])) > 100 then
    raise exception 'At most 100 public profiles can be requested at once';
  end if;

  return query
  select
    profile.id,
    profile.avatar_url,
    profile.display_name,
    case when profile.public_email then profile.email else null end,
    case when profile.public_gender then profile.gender else null end,
    case when profile.public_real_name then profile.real_name else null end,
    case when profile.public_phone then profile.phone else null end,
    case when profile.public_address then profile.address else null end
  from public.profiles as profile
  where profile.id = any (requested_profile_ids);
end;
$$;

grant update (public_email) on public.profiles to authenticated;
revoke all on function public.get_public_profiles(uuid[]) from public;
grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;
