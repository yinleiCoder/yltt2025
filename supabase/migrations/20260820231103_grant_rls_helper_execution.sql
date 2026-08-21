-- RLS policies execute these helpers as the caller. Keep the private schema
-- unexposed while granting only the function privileges the policies require.
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_content_published(uuid) to anon, authenticated;
grant execute on function private.can_read_content(uuid) to anon, authenticated;
