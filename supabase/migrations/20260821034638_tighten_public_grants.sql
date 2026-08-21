-- Keep PostgREST table privileges aligned with the RLS policies. RLS decides
-- which rows are visible; these grants decide which operations are possible.
revoke all on table public.admin_email_allowlist,
  public.profiles,
  public.series,
  public.content_items,
  public.photo_details,
  public.video_details,
  public.content_series,
  public.comments,
  public.role_audit_logs
from anon, authenticated;

-- Public pages only need to read published rows. The policies above continue
-- to enforce publication state and location/comment visibility.
grant select on public.series,
  public.content_items,
  public.photo_details,
  public.video_details,
  public.content_series,
  public.comments
to anon;

-- Signed-in users can read their profile and public content, manage their own
-- profile fields, and create/update/delete comments subject to RLS.
grant select on public.profiles,
  public.series,
  public.content_items,
  public.photo_details,
  public.video_details,
  public.content_series,
  public.comments,
  public.role_audit_logs
to authenticated;

grant update (display_name, avatar_url) on public.profiles to authenticated;
grant insert, update, delete on public.comments to authenticated;

-- Admin UI mutations remain available to authenticated sessions, while the
-- corresponding RLS policies restrict them to administrators.
grant insert, update, delete on public.series,
  public.content_items,
  public.photo_details,
  public.video_details,
  public.content_series
to authenticated;

revoke all on function public.admin_change_user_role(uuid, public.user_role)
from anon, service_role, public;
grant execute on function public.admin_change_user_role(uuid, public.user_role)
to authenticated;
