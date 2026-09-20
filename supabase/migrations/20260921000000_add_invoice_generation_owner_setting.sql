-- Owner-only customer invoice generation control.
-- Default is enabled to preserve existing behavior. Existing invoices remain immutable.
INSERT INTO public.settings (key, value, description)
VALUES (
  'invoice_generation',
  '{"enabled": true}'::jsonb,
  'Owner-only control for customer-facing invoice generation. Defaults to enabled to preserve existing behavior.'
)
ON CONFLICT (key) DO NOTHING;
