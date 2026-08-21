-- YlTt2025 initial content platform. Apply with Supabase migration tooling.
create extension if not exists pgcrypto;

create schema if not exists private;

create type public.user_role as enum ('user', 'admin');
create type public.content_kind as enum ('photo', 'video', 'story');
create type public.location_visibility as enum ('precise', 'city', 'hidden');
create type public.comment_status as enum ('visible', 'hidden');

create table public.admin_email_allowlist (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  description text,
  cover_object_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text check (char_length(excerpt) <= 360),
  markdown_body text,
  cover_object_key text,
  is_featured boolean not null default false,
  published_at timestamptz,
  location_visibility public.location_visibility not null default 'hidden',
  location_label text,
  city text,
  region text,
  country text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_location_coordinates_check check (
    latitude between -90 and 90
    and longitude between -180 and 180
    or (latitude is null and longitude is null)
  ),
  constraint content_location_privacy_check check (
    (location_visibility = 'precise')
    or (location_label is null and latitude is null and longitude is null)
  )
);

create table public.photo_details (
  content_id uuid primary key references public.content_items (id) on delete cascade,
  object_key text not null,
  alt_text text,
  camera_make text,
  camera_model text,
  lens text,
  aperture numeric(5, 2) check (aperture > 0),
  shutter_speed text,
  iso integer check (iso > 0),
  focal_length_mm numeric(6, 2) check (focal_length_mm > 0),
  captured_at timestamptz,
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.video_details (
  content_id uuid primary key references public.content_items (id) on delete cascade,
  object_key text not null,
  poster_object_key text,
  duration_seconds integer check (duration_seconds > 0),
  width integer check (width > 0),
  height integer check (height > 0),
  codec text not null check (codec = 'h264/aac'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_series (
  content_id uuid not null references public.content_items (id) on delete cascade,
  series_id uuid not null references public.series (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (content_id, series_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status public.comment_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  target_id uuid not null references public.profiles (id) on delete restrict,
  previous_role public.user_role not null,
  next_role public.user_role not null,
  created_at timestamptz not null default now(),
  check (actor_id <> target_id),
  check (previous_role <> next_role)
);

create index content_items_featured_published_idx
  on public.content_items (published_at desc, updated_at desc)
  where is_featured and published_at is not null;
create index content_items_published_kind_idx
  on public.content_items (kind, published_at desc)
  where published_at is not null;
create index content_items_created_by_idx on public.content_items (created_by);
create index content_series_series_sort_idx on public.content_series (series_id, sort_order, content_id);
create index comments_content_created_idx on public.comments (content_id, created_at desc);
create index comments_author_idx on public.comments (author_id, created_at desc);
create index role_audit_actor_created_idx on public.role_audit_logs (actor_id, created_at desc);
create index role_audit_target_created_idx on public.role_audit_logs (target_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.is_content_published(requested_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_items
    where id = requested_content_id
      and published_at is not null
      and published_at <= now()
  );
$$;

create or replace function private.can_read_content(requested_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_content_published(requested_content_id)
    or private.is_admin();
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 80), ''),
    case
      when exists (
        select 1
        from public.admin_email_allowlist
        where email = lower(new.email)
      ) then 'admin'::public.user_role
      else 'user'::public.user_role
    end
  );
  return new;
end;
$$;

create or replace function private.prevent_direct_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and current_setting('app.allow_role_change', true) is distinct from 'true' then
    raise exception 'Profile role can only be changed through admin_change_user_role';
  end if;
  return new;
end;
$$;

create or replace function private.require_content_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_kind public.content_kind;
begin
  expected_kind := case tg_table_name
    when 'photo_details' then 'photo'::public.content_kind
    when 'video_details' then 'video'::public.content_kind
  end;

  if not exists (
    select 1 from public.content_items
    where id = new.content_id and kind = expected_kind
  ) then
    raise exception 'Content detail does not match its content kind';
  end if;
  return new;
end;
$$;

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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger series_set_updated_at
before update on public.series
for each row execute function private.set_updated_at();
create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function private.set_updated_at();
create trigger photo_details_set_updated_at
before update on public.photo_details
for each row execute function private.set_updated_at();
create trigger video_details_set_updated_at
before update on public.video_details
for each row execute function private.set_updated_at();
create trigger comments_set_updated_at
before update on public.comments
for each row execute function private.set_updated_at();
create trigger profiles_protect_role
before update on public.profiles
for each row execute function private.prevent_direct_role_change();
create trigger photo_details_require_photo_content
before insert or update on public.photo_details
for each row execute function private.require_content_kind();
create trigger video_details_require_video_content
before insert or update on public.video_details
for each row execute function private.require_content_kind();
create trigger auth_user_creates_profile
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.admin_email_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.series enable row level security;
alter table public.content_items enable row level security;
alter table public.photo_details enable row level security;
alter table public.video_details enable row level security;
alter table public.content_series enable row level security;
alter table public.comments enable row level security;
alter table public.role_audit_logs enable row level security;

create policy "Profiles are visible to their owner or admins"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));
create policy "Users can edit their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Published content is public"
on public.content_items for select to anon, authenticated
using (published_at is not null and published_at <= now());
create policy "Admins can manage content"
on public.content_items for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Readable photo details follow their content"
on public.photo_details for select to anon, authenticated
using ((select private.can_read_content(content_id)));
create policy "Admins can manage photo details"
on public.photo_details for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Readable video details follow their content"
on public.video_details for select to anon, authenticated
using ((select private.can_read_content(content_id)));
create policy "Admins can manage video details"
on public.video_details for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Series with public content are readable"
on public.series for select to anon, authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.content_series
    join public.content_items on content_items.id = content_series.content_id
    where content_series.series_id = series.id
      and content_items.published_at is not null
      and content_items.published_at <= now()
  )
);
create policy "Admins can manage series"
on public.series for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Readable series entries follow their content"
on public.content_series for select to anon, authenticated
using ((select private.can_read_content(content_id)));
create policy "Admins can manage content series"
on public.content_series for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Visible comments on published content are public"
on public.comments for select to anon, authenticated
using (
  (status = 'visible' and (select private.is_content_published(content_id)))
  or ((select auth.uid()) = author_id)
  or (select private.is_admin())
);
create policy "Users can add comments to published content"
on public.comments for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and status = 'visible'
  and (select private.is_content_published(content_id))
);
create policy "Users can update their own visible comments"
on public.comments for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id and status = 'visible');
create policy "Admins can manage comments"
on public.comments for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "Users can delete their own comments"
on public.comments for delete to authenticated
using ((select auth.uid()) = author_id);

create policy "Admins can read role audit logs"
on public.role_audit_logs for select to authenticated
using ((select private.is_admin()));

revoke all on schema private from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_content_published(uuid) from public;
revoke all on function private.can_read_content(uuid) from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.prevent_direct_role_change() from public;
revoke all on function private.require_content_kind() from public;
revoke all on function public.admin_change_user_role(uuid, public.user_role) from public;
grant execute on function public.admin_change_user_role(uuid, public.user_role) to authenticated;

grant select on public.content_items, public.photo_details, public.video_details,
  public.series, public.content_series, public.comments to anon;
grant select, insert, update, delete on public.profiles, public.series,
  public.content_items, public.photo_details, public.video_details,
  public.content_series, public.comments, public.role_audit_logs to authenticated;
grant select, insert, update, delete on public.admin_email_allowlist, public.profiles,
  public.series, public.content_items, public.photo_details, public.video_details,
  public.content_series, public.comments, public.role_audit_logs to service_role;
