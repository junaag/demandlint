-- Deterministic, synthetic local pre-production data. Never apply this seed to a hosted project.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000312',
  'authenticated',
  'authenticated',
  'test@demandlint.local',
  crypt('DemandLint-Local-Only-0312!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"DemandLint Test Owner"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000003120',
  '00000000-0000-4000-8000-000000000312',
  '00000000-0000-4000-8000-000000000312',
  '{"sub":"00000000-0000-4000-8000-000000000312","email":"test@demandlint.local","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(),
  now(),
  now()
);

-- Replace the trigger-created organization with stable local identifiers.
delete from public.organizations
where created_by = '00000000-0000-4000-8000-000000000312';

insert into public.organizations (id, name, created_by)
values (
  '00000000-0000-4000-8000-000000000313',
  'DemandLint Test Workspace',
  '00000000-0000-4000-8000-000000000312'
);

insert into public.organization_memberships (organization_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000313',
  '00000000-0000-4000-8000-000000000312',
  'owner'
);

update public.profiles
set display_name = 'DemandLint Test Owner',
    active_organization_id = '00000000-0000-4000-8000-000000000313',
    updated_at = now()
where id = '00000000-0000-4000-8000-000000000312';

insert into public.contact_preferences (organization_id, preferences, updated_by)
values (
  '00000000-0000-4000-8000-000000000313',
  '{"emailPriority":["professional","secondary","personal","other"],"phonePriority":["mobile","direct","standard","other"],"defaultPhoneCountry":"FR","exportMode":"all"}'::jsonb,
  '00000000-0000-4000-8000-000000000312'
);

insert into public.mapping_templates (
  id,
  organization_id,
  name,
  source_mapping,
  source_signature,
  created_by
)
values (
  '00000000-0000-4000-8000-000000000314',
  '00000000-0000-4000-8000-000000000313',
  'Event leads',
  '{"First Name":{"kind":"canonical","field":"firstName"},"Last Name":{"kind":"canonical","field":"lastName"},"Work Email":{"kind":"canonical","field":"emailProfessional"},"Company":{"kind":"canonical","field":"company"},"Event Date":{"kind":"canonical","field":"initialResponseDate"}}'::jsonb,
  array['First Name', 'Last Name', 'Work Email', 'Company', 'Event Date'],
  '00000000-0000-4000-8000-000000000312'
);

insert into public.export_templates (
  id,
  organization_id,
  name,
  destination_type,
  config,
  created_by
)
values
(
  '00000000-0000-4000-8000-000000000315',
  '00000000-0000-4000-8000-000000000313',
  'Simple CSV contacts',
  null,
  $json${
    "defaultFormat": "csv",
    "delimiter": ",",
    "columns": [
      {"id":"csv-first","header":"First name","source":{"kind":"canonical","field":"firstName"},"emptyValueHandling":{"kind":"leaveBlank"},"format":"text"},
      {"id":"csv-last","header":"Last name","source":{"kind":"canonical","field":"lastName"},"emptyValueHandling":{"kind":"leaveBlank"},"format":"text"},
      {"id":"csv-email","header":"Email","source":{"kind":"canonical","field":"emailProfessional"},"emptyValueHandling":{"kind":"required"},"validationRules":[{"kind":"simple","outcome":"block","validation":"email"}],"format":"text"}
    ]
  }$json$::jsonb,
  '00000000-0000-4000-8000-000000000312'
),
(
  '00000000-0000-4000-8000-000000000316',
  '00000000-0000-4000-8000-000000000313',
  'CRM XLSX import',
  'CRM',
  $json${
    "defaultFormat": "xlsx",
    "sheetName": "CRM Import",
    "columns": [
      {"id":"xlsx-company","header":"Account Name","source":{"kind":"canonical","field":"company"},"emptyValueHandling":{"kind":"required"},"format":"text"},
      {"id":"xlsx-title","header":"Job Title","source":{"kind":"canonical","field":"jobTitle"},"emptyValueHandling":{"kind":"leaveBlank"},"format":"text"},
      {"id":"xlsx-date","header":"Initial Response Date","source":{"kind":"canonical","field":"initialResponseDate"},"emptyValueHandling":{"kind":"leaveBlank"},"format":"date","datePattern":"MM/dd/yyyy"}
    ]
  }$json$::jsonb,
  '00000000-0000-4000-8000-000000000312'
),
(
  '00000000-0000-4000-8000-000000000317',
  '00000000-0000-4000-8000-000000000313',
  'Campaign validation scenarios',
  'Marketing automation',
  $json${
    "defaultFormat": "csv",
    "delimiter": ";",
    "columns": [
      {"id":"validation-email","header":"Email","source":{"kind":"canonical","field":"emailProfessional"},"emptyValueHandling":{"kind":"required"},"validationRules":[{"kind":"simple","outcome":"block","validation":"email"}],"format":"text"},
      {"id":"validation-status","header":"Member Status","source":{"kind":"fixed"},"emptyValueHandling":{"kind":"required"},"validationRules":[{"kind":"allowedValues","outcome":"block","values":["Registered","Attended","No show"]}],"format":"text"},
      {"id":"validation-date","header":"Response Date","source":{"kind":"canonical","field":"initialResponseDate"},"emptyValueHandling":{"kind":"replace","value":"1970-01-01"},"format":"date","datePattern":"yyyy-MM-dd"},
      {"id":"validation-empty","header":"Reserved","source":{"kind":"empty"},"format":"text"}
    ]
  }$json$::jsonb,
  '00000000-0000-4000-8000-000000000312'
);
