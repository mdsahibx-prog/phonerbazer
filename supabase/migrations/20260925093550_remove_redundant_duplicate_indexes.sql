-- Remove only exact duplicate indexes reported by the Supabase advisor.
-- The retained indexes have equivalent definitions and remain available to queries.
drop index if exists public.idx_customers_phone;
drop index if exists public.delivery_provider_credentials_redx_idx;
drop index if exists public.idx_orders_status_created;
drop index if exists public.idx_product_images_one_primary;
