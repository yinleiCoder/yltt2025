-- Only authenticated requests may reach the role-management RPC.
-- The function performs its own administrator check before changing any role.
revoke all on function public.admin_change_user_role(uuid, public.user_role)
  from anon, service_role, public;

grant execute on function public.admin_change_user_role(uuid, public.user_role)
  to authenticated;
