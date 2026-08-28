-- Private master workbooks attached to existing export templates.
-- Object paths are: <organization uuid>/<template uuid>/<object uuid>.xlsx

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'export-template-workbooks',
  'export-template-workbooks',
  false,
  26214400,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "workspace members can read template workbooks"
on storage.objects for select to authenticated
using (
  bucket_id = 'export-template-workbooks'
  and (select private.is_organization_member(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end
  ))
);

create policy "workspace members can create template workbooks"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'export-template-workbooks'
  and (select private.is_organization_member(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end
  ))
);

create policy "workspace members can update template workbooks"
on storage.objects for update to authenticated
using (
  bucket_id = 'export-template-workbooks'
  and (select private.is_organization_member(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end
  ))
)
with check (
  bucket_id = 'export-template-workbooks'
  and (select private.is_organization_member(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end
  ))
);

create policy "workspace members can delete template workbooks"
on storage.objects for delete to authenticated
using (
  bucket_id = 'export-template-workbooks'
  and (select private.is_organization_member(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end
  ))
);
