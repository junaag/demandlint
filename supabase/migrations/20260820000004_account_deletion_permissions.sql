-- Restrict account deletion to authenticated user sessions only.

revoke all on function private.delete_current_account()
  from public, anon, authenticated, service_role;
revoke all on function public.delete_current_account()
  from public, anon, authenticated, service_role;

grant execute on function private.delete_current_account() to authenticated;
grant execute on function public.delete_current_account() to authenticated;
