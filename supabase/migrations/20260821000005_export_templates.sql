-- DemandLint V0.3.0 destination export templates.
-- Only reusable template metadata is synchronized; lead rows remain browser-local.

create table public.export_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  destination_type text not null check (char_length(trim(destination_type)) between 1 and 120),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index export_templates_organization_id
  on public.export_templates (organization_id);
create index export_templates_created_by
  on public.export_templates (created_by);
create unique index export_templates_organization_name
  on public.export_templates (organization_id, lower(trim(name)));

alter table public.export_templates enable row level security;

create policy "members can read export templates"
on public.export_templates for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "members can create export templates"
on public.export_templates for insert to authenticated
with check (
  (select private.is_organization_member(organization_id))
  and created_by = (select auth.uid())
);

create policy "members can update export templates"
on public.export_templates for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "members can delete export templates"
on public.export_templates for delete to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on public.export_templates from anon;
grant select, insert, update, delete on public.export_templates to authenticated;
