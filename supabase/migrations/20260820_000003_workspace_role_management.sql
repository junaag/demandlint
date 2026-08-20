-- DemandLint workspace role hierarchy and ownership transfer.

create unique index if not exists organization_memberships_single_owner
  on public.organization_memberships (organization_id)
  where role = 'owner';

create or replace function private.update_organization_member_role(
  target_organization_id uuid,
  target_member_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  target_role text;
  target_confirmed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_role not in ('admin', 'member') then
    raise exception 'A member role must be admin or member';
  end if;

  select membership.role into caller_role
  from public.organization_memberships membership
  where membership.organization_id = target_organization_id
    and membership.user_id = auth.uid();

  if caller_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can manage member roles';
  end if;

  select membership.role, auth_user.email_confirmed_at
  into target_role, target_confirmed_at
  from public.organization_memberships membership
  join auth.users auth_user on auth_user.id = membership.user_id
  where membership.organization_id = target_organization_id
    and membership.user_id = target_member_id;

  if target_role is null then raise exception 'The workspace member could not be found'; end if;
  if target_confirmed_at is null then
    raise exception 'The invitation must be accepted before changing this role';
  end if;
  if target_role = 'owner' then
    raise exception 'The owner role can only be changed by transferring ownership';
  end if;

  if caller_role = 'owner' then
    update public.organization_memberships membership
    set role = new_role
    where membership.organization_id = target_organization_id
      and membership.user_id = target_member_id;
    return;
  end if;

  if target_member_id = auth.uid()
     and target_role = 'admin'
     and new_role = 'member' then
    update public.organization_memberships membership
    set role = 'member'
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid();
    return;
  end if;

  if target_role = 'member' and new_role = 'admin' then
    update public.organization_memberships membership
    set role = 'admin'
    where membership.organization_id = target_organization_id
      and membership.user_id = target_member_id;
    return;
  end if;

  raise exception 'Admins can promote members and demote only their own account';
end;
$$;

create or replace function private.transfer_organization_ownership(
  target_organization_id uuid,
  new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  new_owner_role text;
  new_owner_confirmed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select membership.role into caller_role
  from public.organization_memberships membership
  where membership.organization_id = target_organization_id
    and membership.user_id = auth.uid();

  if caller_role <> 'owner' then
    raise exception 'Only the workspace owner can transfer ownership';
  end if;
  if new_owner_id = auth.uid() then
    raise exception 'Choose another admin as the new owner';
  end if;

  select membership.role, auth_user.email_confirmed_at
  into new_owner_role, new_owner_confirmed_at
  from public.organization_memberships membership
  join auth.users auth_user on auth_user.id = membership.user_id
  where membership.organization_id = target_organization_id
    and membership.user_id = new_owner_id;

  if new_owner_role <> 'admin' or new_owner_confirmed_at is null then
    raise exception 'Ownership can only be transferred to an active admin';
  end if;

  update public.organization_memberships membership
  set role = 'admin'
  where membership.organization_id = target_organization_id
    and membership.user_id = auth.uid()
    and membership.role = 'owner';

  update public.organization_memberships membership
  set role = 'owner'
  where membership.organization_id = target_organization_id
    and membership.user_id = new_owner_id
    and membership.role = 'admin';

  if not found then raise exception 'Ownership could not be transferred'; end if;
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
  caller_role text;
  member_role text;
  member_email text;
  member_confirmed_at timestamptz;
begin
  select membership.role into caller_role
  from public.organization_memberships membership
  where membership.organization_id = target_organization_id
    and membership.user_id = auth.uid();

  if caller_role not in ('owner', 'admin') then
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
  if member_user_id = auth.uid() then raise exception 'You cannot revoke your own workspace access'; end if;
  if caller_role = 'admin' and member_role <> 'member' then
    raise exception 'Admins can only revoke members';
  end if;
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

create or replace function private.delete_current_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_organization record;
  successor_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  for owned_organization in
    select membership.organization_id
    from public.organization_memberships membership
    where membership.user_id = auth.uid() and membership.role = 'owner'
  loop
    successor_id := null;
    select membership.user_id into successor_id
    from public.organization_memberships membership
    where membership.organization_id = owned_organization.organization_id
      and membership.user_id <> auth.uid()
    order by case membership.role when 'admin' then 0 else 1 end, membership.created_at
    limit 1;

    if successor_id is null then
      delete from public.organizations where id = owned_organization.organization_id;
    else
      update public.organization_memberships
      set role = 'admin'
      where organization_id = owned_organization.organization_id
        and user_id = auth.uid();

      update public.organization_memberships
      set role = 'owner'
      where organization_id = owned_organization.organization_id
        and user_id = successor_id;
    end if;
  end loop;

  delete from auth.users where id = auth.uid();
end;
$$;

create or replace function public.update_organization_member_role(
  target_organization_id uuid,
  target_member_id uuid,
  new_role text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.update_organization_member_role($1, $2, $3); $$;

create or replace function public.transfer_organization_ownership(
  target_organization_id uuid,
  new_owner_id uuid
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.transfer_organization_ownership($1, $2); $$;

revoke all on function private.update_organization_member_role(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.transfer_organization_ownership(uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_organization_member_role(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.transfer_organization_ownership(uuid, uuid) from public, anon, authenticated;

grant execute on function private.update_organization_member_role(uuid, uuid, text) to authenticated;
grant execute on function private.transfer_organization_ownership(uuid, uuid) to authenticated;
grant execute on function public.update_organization_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_organization_ownership(uuid, uuid) to authenticated;
