-- DemandLint workspace invitation delivery and member access management.

create or replace function private.list_organization_members(target_organization_id uuid)
returns table (
  member_id text,
  email text,
  display_name text,
  role text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'You do not belong to this organization';
  end if;

  return query
    select listed.member_id, listed.email, listed.display_name, listed.role, listed.status
    from (
      select
        profile.id::text as member_id,
        profile.email,
        profile.display_name,
        membership.role,
        case
          when auth_user.email_confirmed_at is null then 'invited'::text
          else 'active'::text
        end as status
      from public.organization_memberships membership
      join public.profiles profile on profile.id = membership.user_id
      join auth.users auth_user on auth_user.id = membership.user_id
      where membership.organization_id = target_organization_id
      union all
      select
        'invited:' || invitation.id::text as member_id,
        invitation.email,
        null::text as display_name,
        invitation.role,
        'invited'::text as status
      from public.organization_invitations invitation
      where invitation.organization_id = target_organization_id
        and invitation.accepted_at is null
    ) listed
    order by listed.status, listed.email;
end;
$$;

create or replace function private.get_organization_invitation_delivery(
  target_organization_id uuid,
  target_member_email text,
  require_pending boolean default false
)
returns table (
  email text,
  member_role text,
  member_status text,
  organization_name text,
  inviter_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(target_member_email));
  delivery_role text;
  delivery_status text;
  delivery_organization_name text;
  delivery_inviter_name text;
begin
  if not private.is_organization_admin(target_organization_id) then
    raise exception 'Only owners and admins can manage invitations';
  end if;

  select membership.role,
         case when auth_user.email_confirmed_at is null then 'invited' else 'active' end
  into delivery_role, delivery_status
  from public.organization_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  join auth.users auth_user on auth_user.id = membership.user_id
  where membership.organization_id = target_organization_id
    and profile.email = normalized_email;

  if delivery_role is null then
    select invitation.role, 'invited'
    into delivery_role, delivery_status
    from public.organization_invitations invitation
    where invitation.organization_id = target_organization_id
      and invitation.email = normalized_email
      and invitation.accepted_at is null
    order by invitation.created_at desc
    limit 1;
  end if;

  if delivery_role is null then
    raise exception 'The invitation could not be found';
  end if;
  if require_pending and delivery_status <> 'invited' then
    raise exception 'Only pending invitations can be resent';
  end if;

  select organization.name into delivery_organization_name
  from public.organizations organization
  where organization.id = target_organization_id;

  select coalesce(nullif(trim(profile.display_name), ''), profile.email)
  into delivery_inviter_name
  from public.profiles profile
  where profile.id = auth.uid();

  return query select
    normalized_email,
    delivery_role,
    delivery_status,
    delivery_organization_name,
    coalesce(delivery_inviter_name, 'A DemandLint teammate');
end;
$$;

create or replace function private.remove_organization_member(
  target_organization_id uuid,
  target_member_id text,
  removal_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  member_user_id uuid;
  member_role text;
  member_email text;
  member_confirmed_at timestamptz;
begin
  if not private.is_organization_admin(target_organization_id) then
    raise exception 'Only owners and admins can manage members';
  end if;
  if removal_type not in ('cancel', 'revoke') then
    raise exception 'Unsupported member removal type';
  end if;

  if target_member_id like 'invited:%' then
    if removal_type <> 'cancel' then
      raise exception 'Pending invitations must be cancelled';
    end if;
    begin
      invitation_id := substring(target_member_id from 9)::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid invitation identifier';
    end;

    delete from public.organization_invitations invitation
    where invitation.id = invitation_id
      and invitation.organization_id = target_organization_id
      and invitation.accepted_at is null;
    if not found then raise exception 'The pending invitation could not be found'; end if;
    return;
  end if;

  begin
    member_user_id := target_member_id::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid member identifier';
  end;

  select membership.role, profile.email, auth_user.email_confirmed_at
  into member_role, member_email, member_confirmed_at
  from public.organization_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  join auth.users auth_user on auth_user.id = membership.user_id
  where membership.organization_id = target_organization_id
    and membership.user_id = member_user_id;

  if member_role is null then raise exception 'The workspace member could not be found'; end if;
  if member_role = 'owner' then raise exception 'The workspace owner cannot be removed'; end if;
  if member_user_id = auth.uid() then raise exception 'You cannot remove your own workspace access'; end if;
  if removal_type = 'cancel' and member_confirmed_at is not null then
    raise exception 'Active members must be revoked, not cancelled';
  end if;
  if removal_type = 'revoke' and member_confirmed_at is null then
    raise exception 'Pending invitations must be cancelled, not revoked';
  end if;

  delete from public.organization_memberships membership
  where membership.organization_id = target_organization_id
    and membership.user_id = member_user_id;

  delete from public.organization_invitations invitation
  where invitation.organization_id = target_organization_id
    and invitation.email = member_email;

  update public.profiles profile
  set active_organization_id = (
        select membership.organization_id
        from public.organization_memberships membership
        where membership.user_id = member_user_id
        order by membership.created_at
        limit 1
      ),
      updated_at = now()
  where profile.id = member_user_id
    and profile.active_organization_id = target_organization_id;

  if removal_type = 'cancel'
     and member_confirmed_at is null
     and not exists (
       select 1 from public.organization_memberships membership
       where membership.user_id = member_user_id
     ) then
    delete from auth.users auth_user where auth_user.id = member_user_id;
  end if;
end;
$$;

create or replace function public.get_organization_invitation_delivery(
  target_organization_id uuid,
  target_member_email text,
  require_pending boolean default false
)
returns table (
  email text,
  member_role text,
  member_status text,
  organization_name text,
  inviter_name text
)
language sql
security invoker
set search_path = ''
as $$ select * from private.get_organization_invitation_delivery($1, $2, $3); $$;

create or replace function public.remove_organization_member(
  target_organization_id uuid,
  target_member_id text,
  removal_type text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_organization_member($1, $2, $3); $$;

revoke all on function private.get_organization_invitation_delivery(uuid, text, boolean) from public, anon, authenticated;
revoke all on function private.remove_organization_member(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_organization_invitation_delivery(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.remove_organization_member(uuid, text, text) from public, anon, authenticated;

grant execute on function private.get_organization_invitation_delivery(uuid, text, boolean) to authenticated;
grant execute on function private.remove_organization_member(uuid, text, text) to authenticated;
grant execute on function public.get_organization_invitation_delivery(uuid, text, boolean) to authenticated;
grant execute on function public.remove_organization_member(uuid, text, text) to authenticated;
