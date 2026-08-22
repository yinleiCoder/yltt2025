create type public.profile_gender as enum ('male', 'female', 'other', 'unknown');

alter table public.profiles
  add column real_name text check (char_length(real_name) between 1 and 80),
  add column phone text check (char_length(phone) between 1 and 32),
  add column address text check (char_length(address) between 1 and 240),
  add column gender public.profile_gender,
  add column public_gender boolean not null default false,
  add column public_real_name boolean not null default false,
  add column public_phone boolean not null default false,
  add column public_address boolean not null default false;

create or replace function public.get_public_profiles(requested_profile_ids uuid[])
returns table (
  id uuid,
  avatar_url text,
  display_name text,
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
    case when profile.public_gender then profile.gender else null end as gender,
    case when profile.public_real_name then profile.real_name else null end as real_name,
    case when profile.public_phone then profile.phone else null end as phone,
    case when profile.public_address then profile.address else null end as address
  from public.profiles as profile
  where profile.id = any (requested_profile_ids);
end;
$$;

grant update (
  display_name,
  avatar_url,
  real_name,
  phone,
  address,
  gender,
  public_gender,
  public_real_name,
  public_phone,
  public_address
) on public.profiles to authenticated;

revoke all on function public.get_public_profiles(uuid[]) from public;
grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;
