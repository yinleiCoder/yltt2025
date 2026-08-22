alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists public_birth_date boolean not null default false;

grant update (birth_date, public_birth_date) on public.profiles to authenticated;

drop function if exists public.get_public_profiles(uuid[]);

create function public.get_public_profiles(requested_profile_ids uuid[])
returns table (
  id uuid,
  avatar_url text,
  display_name text,
  email text,
  age integer,
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
    case
      when profile.public_birth_date
        and profile.birth_date is not null
        and profile.birth_date <= current_date
      then extract(year from age(current_date, profile.birth_date))::integer
      else null
    end as age,
    case when profile.public_gender then profile.gender else null end,
    case when profile.public_real_name then profile.real_name else null end,
    case when profile.public_phone then profile.phone else null end,
    case when profile.public_address then profile.address else null end
  from public.profiles as profile
  where profile.id = any (requested_profile_ids);
end;
$$;

revoke all on function public.get_public_profiles(uuid[]) from public;
grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;
