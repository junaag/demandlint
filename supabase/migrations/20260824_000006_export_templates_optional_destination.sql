-- Destination is optional for reusable export templates.
alter table public.export_templates
  alter column destination_type drop not null;

alter table public.export_templates
  drop constraint if exists export_templates_destination_type_check;

alter table public.export_templates
  add constraint export_templates_destination_type_check
  check (
    destination_type is null
    or char_length(trim(destination_type)) between 1 and 120
  );
