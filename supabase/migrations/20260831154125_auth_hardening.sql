-- DemandLint V0.3.13 authentication eligibility and unified application provisioning.
-- Authentication remains Supabase Auth's responsibility. This migration deliberately removes
-- automatic application provisioning from auth.users so eligibility is decided first.

drop trigger if exists on_auth_user_created on auth.users;

create table if not exists private.email_domain_restrictions (
  category text not null check (category in ('consumer', 'disposable')),
  match_type text not null check (match_type in ('exact', 'prefix')),
  pattern text not null check (pattern = lower(trim(pattern)) and pattern <> ''),
  created_at timestamptz not null default now(),
  primary key (category, match_type, pattern)
);

insert into private.email_domain_restrictions (category, match_type, pattern)
values
  ('consumer', 'exact', 'gmail.com'),
  ('consumer', 'exact', 'googlemail.com'),
  ('consumer', 'exact', 'icloud.com'),
  ('consumer', 'exact', 'mac.com'),
  ('consumer', 'exact', 'mail.com'),
  ('consumer', 'exact', 'me.com'),
  ('consumer', 'exact', 'outlook.com'),
  ('consumer', 'exact', 'proton.me'),
  ('consumer', 'exact', 'rocketmail.com'),
  ('consumer', 'exact', 'ymail.com'),
  ('consumer', 'prefix', 'aol.'),
  ('consumer', 'prefix', 'gmx.'),
  ('consumer', 'prefix', 'hotmail.'),
  ('consumer', 'prefix', 'live.'),
  ('consumer', 'prefix', 'msn.'),
  ('consumer', 'prefix', 'protonmail.'),
  ('consumer', 'prefix', 'yahoo.'),
  ('disposable', 'exact', '10minutemail.com'),
  ('disposable', 'exact', 'dispostable.com'),
  ('disposable', 'exact', 'emailondeck.com'),
  ('disposable', 'exact', 'fakeinbox.com'),
  ('disposable', 'exact', 'getnada.com'),
  ('disposable', 'exact', 'grr.la'),
  ('disposable', 'exact', 'guerrillamail.com'),
  ('disposable', 'exact', 'guerrillamailblock.com'),
  ('disposable', 'exact', 'maildrop.cc'),
  ('disposable', 'exact', 'mailinator.com'),
  ('disposable', 'exact', 'mintemail.com'),
  ('disposable', 'exact', 'moakt.com'),
  ('disposable', 'exact', 'mytemp.email'),
  ('disposable', 'exact', 'sharklasers.com'),
  ('disposable', 'exact', 'temp-mail.org'),
  ('disposable', 'exact', 'tempail.com'),
  ('disposable', 'exact', 'tempr.email'),
  ('disposable', 'exact', 'throwawaymail.com'),
  ('disposable', 'exact', 'trashmail.com'),
  ('disposable', 'exact', 'yopmail.com')
on conflict (category, match_type, pattern) do nothing;

create or replace function private.email_eligibility(input_email text)
returns table (eligible boolean, reason text, normalized_email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(trim(input_email));
  email_domain text;
  restriction_category text;
begin
  if clean_email is null
     or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return query select false, 'invalid'::text, clean_email;
    return;
  end if;

  if clean_email = 'ju.imbert@gmail.com' then
    return query select true, 'allowed'::text, clean_email;
    return;
  end if;

  email_domain := split_part(clean_email, '@', 2);
  select restriction.category
  into restriction_category
  from private.email_domain_restrictions restriction
  where (
      restriction.match_type = 'exact'
      and (
        email_domain = restriction.pattern
        or email_domain like '%.' || restriction.pattern
      )
    ) or (
      restriction.match_type = 'prefix'
      and email_domain like restriction.pattern || '%'
    )
  order by case restriction.category when 'disposable' then 0 else 1 end
  limit 1;

  if restriction_category is not null then
    return query select false, restriction_category, clean_email;
    return;
  end if;

  return query select true, 'allowed'::text, clean_email;
end;
$$;

create or replace function private.invite_organization_member(
  target_organization_id uuid,
  member_email text,
  member_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(member_email));
  existing_user_id uuid;
  policy_status text;
begin
  if not private.is_organization_admin(target_organization_id) then
    raise exception 'Only owners and admins can invite members';
  end if;
  select eligibility.reason
  into policy_status
  from private.email_eligibility(normalized_email) eligibility;
  if policy_status = 'disposable' then
    raise exception 'Temporary email addresses are not supported. Please use your work email address.';
  end if;
  if policy_status <> 'allowed' then
    raise exception 'DemandLint is available for business accounts only. Please sign in with your work email address.';
  end if;
  if member_role not in ('admin', 'member') then
    raise exception 'Invited members must be an admin or member';
  end if;

  select user_profile.id into existing_user_id
  from public.profiles user_profile
  where user_profile.email = normalized_email;

  if existing_user_id is not null then
    insert into public.organization_memberships (organization_id, user_id, role)
    values (target_organization_id, existing_user_id, member_role)
    on conflict (organization_id, user_id) do update
      set role = case
        when public.organization_memberships.role = 'owner' then 'owner'
        else excluded.role
      end;

    update public.profiles
    set active_organization_id = coalesce(active_organization_id, target_organization_id),
        updated_at = now()
    where id = existing_user_id;

    update public.organization_invitations
    set accepted_at = now()
    where organization_id = target_organization_id
      and email = normalized_email
      and accepted_at is null;
  else
    insert into public.organization_invitations (organization_id, email, role, invited_by)
    values (target_organization_id, normalized_email, member_role, auth.uid())
    on conflict (organization_id, email) where accepted_at is null
    do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
  end if;
end;
$$;

create or replace function private.provision_current_user()
returns table (
  eligibility_status text,
  workspace_id uuid,
  workspace_created boolean,
  invitations_accepted integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  policy_status text;
  initial_organization_id uuid;
  organization_label text;
  profile_label text;
  created_workspace boolean := false;
  accepted_count integer := 0;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select lower(trim(auth_user.email))
  into current_email
  from auth.users auth_user
  where auth_user.id = current_user_id
  for update;
  if current_email is null then raise exception 'The authenticated account has no email address'; end if;

  select eligibility.reason
  into policy_status
  from private.email_eligibility(current_email) eligibility;
  if policy_status <> 'allowed' then
    return query select policy_status, null::uuid, false, 0;
    return;
  end if;

  profile_label := initcap(replace(replace(split_part(current_email, '@', 1), '.', ' '), '_', ' '));
  insert into public.profiles (id, email, display_name)
  values (current_user_id, current_email, nullif(trim(profile_label), ''))
  on conflict (id) do nothing;

  insert into public.organization_memberships (organization_id, user_id, role)
  select invitation.organization_id, current_user_id, invitation.role
  from public.organization_invitations invitation
  where invitation.email = current_email
    and invitation.accepted_at is null
  on conflict (organization_id, user_id) do nothing;
  get diagnostics accepted_count = row_count;

  update public.organization_invitations invitation
  set accepted_at = now()
  where invitation.email = current_email
    and invitation.accepted_at is null
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = invitation.organization_id
        and membership.user_id = current_user_id
    );

  select profile.active_organization_id
  into initial_organization_id
  from public.profiles profile
  where profile.id = current_user_id
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = profile.active_organization_id
        and membership.user_id = current_user_id
    );

  if initial_organization_id is null then
    select membership.organization_id
    into initial_organization_id
    from public.organization_memberships membership
    where membership.user_id = current_user_id
    order by membership.created_at, membership.organization_id
    limit 1;
  end if;

  if initial_organization_id is null then
    organization_label := case
      when current_email = 'ju.imbert@gmail.com' then 'Julien Perso'
      else initcap(replace(split_part(split_part(current_email, '@', 2), '.', 1), '-', ' ')) || ' workspace'
    end;
    insert into public.organizations (name, created_by)
    values (coalesce(nullif(trim(organization_label), ''), 'My workspace'), current_user_id)
    returning id into initial_organization_id;

    insert into public.organization_memberships (organization_id, user_id, role)
    values (initial_organization_id, current_user_id, 'owner');
    created_workspace := true;
  end if;

  update public.profiles profile
  set active_organization_id = initial_organization_id,
      updated_at = now()
  where profile.id = current_user_id
    and profile.active_organization_id is distinct from initial_organization_id
    and not exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = profile.active_organization_id
        and membership.user_id = current_user_id
    );

  return query select 'allowed'::text, initial_organization_id, created_workspace, accepted_count;
end;
$$;

create or replace function public.evaluate_email_eligibility(input_email text)
returns table (eligible boolean, reason text)
language sql
stable
security invoker
set search_path = ''
as $$
  select result.eligible, nullif(result.reason, 'allowed')
  from private.email_eligibility($1) result;
$$;

create or replace function public.complete_authentication()
returns table (
  eligibility_status text,
  workspace_id uuid,
  workspace_created boolean,
  invitations_accepted integer
)
language sql
security invoker
set search_path = ''
as $$ select * from private.provision_current_user(); $$;

revoke all on table private.email_domain_restrictions from public, anon, authenticated;
revoke all on function private.email_eligibility(text) from public, anon, authenticated;
revoke all on function private.provision_current_user() from public, anon, authenticated;
revoke all on function public.evaluate_email_eligibility(text) from public, anon, authenticated;
revoke all on function public.complete_authentication() from public, anon, authenticated;

grant execute on function private.email_eligibility(text) to anon, authenticated;
grant execute on function private.provision_current_user() to authenticated;
grant execute on function public.evaluate_email_eligibility(text) to anon, authenticated;
grant execute on function public.complete_authentication() to authenticated;
