insert into public.settings (key, value, description)
values (
  'landing_page_access',
  '{"admin_enabled": true}'::jsonb,
  'Owner-controlled access for ADMIN users to Landing Page management.'
)
on conflict (key) do nothing;
