-- DemandLint V0.2.2 hosted account control plane.
-- Raw lead files and processed lead rows are intentionally absent from this schema.

create extension if not exists pgcrypto;
create schema if not exists private;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(trim(email))),
  display_name text,
  active_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  role text not null check (role in ('admin', 'member')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index organization_invitations_pending_email
  on public.organization_invitations (organization_id, email)
  where accepted_at is null;

create table public.contact_preferences (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table public.mapping_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  source_mapping jsonb not null default '{}'::jsonb,
  destination_mapping jsonb,
  source_signature text[],
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_memberships_user_id
  on public.organization_memberships (user_id);
create index organizations_created_by
  on public.organizations (created_by);
create index profiles_active_organization_id
  on public.profiles (active_organization_id);
create index organization_invitations_invited_by
  on public.organization_invitations (invited_by);
create index contact_preferences_updated_by
  on public.contact_preferences (updated_by);
create index mapping_templates_organization_id
  on public.mapping_templates (organization_id);
create index mapping_templates_created_by
  on public.mapping_templates (created_by);

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'admin')
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  initial_organization_id uuid;
  organization_label text;
  profile_label text;
begin
  profile_label := initcap(replace(replace(split_part(new.email, '@', 1), '.', ' '), '_', ' '));

  insert into public.profiles (id, email, display_name)
  values (new.id, lower(trim(new.email)), nullif(trim(profile_label), ''));

  insert into public.organization_memberships (organization_id, user_id, role)
  select invitation.organization_id, new.id, invitation.role
  from public.organization_invitations invitation
  where invitation.email = lower(trim(new.email))
    and invitation.accepted_at is null
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set accepted_at = now()
  where email = lower(trim(new.email))
    and accepted_at is null;

  select membership.organization_id
  into initial_organization_id
  from public.organization_memberships membership
  where membership.user_id = new.id
  order by membership.created_at
  limit 1;

  if initial_organization_id is null then
    organization_label := initcap(replace(split_part(split_part(new.email, '@', 2), '.', 1), '-', ' '));
    insert into public.organizations (name, created_by)
    values (coalesce(nullif(trim(organization_label), ''), 'My') || ' workspace', new.id)
    returning id into initial_organization_id;

    insert into public.organization_memberships (organization_id, user_id, role)
    values (initial_organization_id, new.id, 'owner');
  end if;

  update public.profiles
  set active_organization_id = initial_organization_id,
      updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create or replace function private.create_organization(organization_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(organization_name)) not between 1 and 120 then
    raise exception 'Enter an organization name between 1 and 120 characters';
  end if;

  insert into public.organizations (name, created_by)
  values (trim(organization_name), auth.uid())
  returning id into new_organization_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'owner');

  update public.profiles
  set active_organization_id = new_organization_id,
      updated_at = now()
  where id = auth.uid();

  return new_organization_id;
end;
$$;

create or replace function private.set_active_organization(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'You do not belong to this organization';
  end if;
  update public.profiles
  set active_organization_id = target_organization_id,
      updated_at = now()
  where id = auth.uid();
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
begin
  if not private.is_organization_admin(target_organization_id) then
    raise exception 'Only owners and admins can invite members';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid member email';
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
        'active'::text as status
      from public.organization_memberships membership
      join public.profiles profile on profile.id = membership.user_id
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
      set role = 'owner'
      where organization_id = owned_organization.organization_id and user_id = successor_id;
    end if;
  end loop;

  delete from auth.users where id = auth.uid();
end;
$$;

-- Public RPC wrappers are security-invoker functions. Privileged implementations stay in the
-- non-exposed private schema and independently validate auth.uid().
create or replace function public.create_organization(organization_name text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_organization($1); $$;

create or replace function public.set_active_organization(target_organization_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_active_organization($1); $$;

create or replace function public.invite_organization_member(
  target_organization_id uuid,
  member_email text,
  member_role text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.invite_organization_member($1, $2, $3); $$;

create or replace function public.list_organization_members(target_organization_id uuid)
returns table (
  member_id text,
  email text,
  display_name text,
  role text,
  status text
)
language sql
security invoker
set search_path = ''
as $$ select * from private.list_organization_members($1); $$;

create or replace function public.delete_current_account()
returns void
language sql
security invoker
set search_path = ''
as $$ select private.delete_current_account(); $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.contact_preferences enable row level security;
alter table public.mapping_templates enable row level security;

create policy "members can read organizations"
on public.organizations for select to authenticated
using ((select private.is_organization_member(id)));

create policy "admins can update organizations"
on public.organizations for update to authenticated
using ((select private.is_organization_admin(id)))
with check ((select private.is_organization_admin(id)));

create policy "users can read shared profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships mine
    join public.organization_memberships theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
);

create policy "members can read memberships"
on public.organization_memberships for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "admins can read invitations"
on public.organization_invitations for select to authenticated
using ((select private.is_organization_admin(organization_id)));

create policy "members can read contact preferences"
on public.contact_preferences for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy "members can create contact preferences"
on public.contact_preferences for insert to authenticated
with check ((select private.is_organization_member(organization_id)));
create policy "members can update contact preferences"
on public.contact_preferences for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "members can read mapping templates"
on public.mapping_templates for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy "members can create mapping templates"
on public.mapping_templates for insert to authenticated
with check ((select private.is_organization_member(organization_id)));
create policy "members can update mapping templates"
on public.mapping_templates for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));
create policy "members can delete mapping templates"
on public.mapping_templates for delete to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on public.organizations from anon;
revoke all on public.profiles from anon;
revoke all on public.organization_memberships from anon;
revoke all on public.organization_invitations from anon;
revoke all on public.contact_preferences from anon;
revoke all on public.mapping_templates from anon;
grant select on public.organizations, public.profiles, public.organization_memberships to authenticated;
grant select on public.organization_invitations to authenticated;
grant select, insert, update on public.contact_preferences to authenticated;
grant select, insert, update, delete on public.mapping_templates to authenticated;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

revoke all on function private.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function private.is_organization_admin(uuid) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.create_organization(text) from public, anon, authenticated;
revoke all on function private.set_active_organization(uuid) from public, anon, authenticated;
revoke all on function private.invite_organization_member(uuid, text, text) from public, anon, authenticated;
revoke all on function private.list_organization_members(uuid) from public, anon, authenticated;
revoke all on function private.delete_current_account() from public, anon, authenticated;

revoke all on function public.create_organization(text) from public, anon, authenticated;
revoke all on function public.set_active_organization(uuid) from public, anon, authenticated;
revoke all on function public.invite_organization_member(uuid, text, text) from public, anon, authenticated;
revoke all on function public.list_organization_members(uuid) from public, anon, authenticated;
revoke all on function public.delete_current_account() from public, anon, authenticated;

-- Supabase's optional automatic-RLS project setting creates this helper in public. Keep the event
-- trigger functional while preventing direct calls from API roles.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
grant execute on function private.create_organization(text) to authenticated;
grant execute on function private.set_active_organization(uuid) to authenticated;
grant execute on function private.invite_organization_member(uuid, text, text) to authenticated;
grant execute on function private.list_organization_members(uuid) to authenticated;
grant execute on function private.delete_current_account() to authenticated;

grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.set_active_organization(uuid) to authenticated;
grant execute on function public.invite_organization_member(uuid, text, text) to authenticated;
grant execute on function public.list_organization_members(uuid) to authenticated;
grant execute on function public.delete_current_account() to authenticated;
