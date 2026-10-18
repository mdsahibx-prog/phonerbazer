-- Consolidate duplicate RLS policies and ensure public catalogue reads
-- consistently require active/published records.
drop policy if exists "Owner writes admin users" on public.admin_users;
drop policy if exists "Owner reads admin users" on public.admin_users;

drop policy if exists "Owner or admin write catalogue brands" on public.brands;
drop policy if exists "Owner or admin write catalogue categories" on public.categories;
drop policy if exists "Owner or admin manage product images" on public.product_images;
drop policy if exists "Owner or admin write variants" on public.product_variants;
drop policy if exists "Owner or admin write catalogue products" on public.products;

drop policy if exists "Owner or admin read catalogue operations" on public.brands;
drop policy if exists "Owner or admin read catalogue categories" on public.categories;
drop policy if exists "Owner or admin read catalogue products" on public.products;
drop policy if exists "Owner or admin read variants" on public.product_variants;
drop policy if exists "Owner or admin read settings" on public.settings;
drop policy if exists "Owner or admin read IMEI" on public.imei_inventory;

drop policy if exists public_read_brands on public.brands;
drop policy if exists public_read_categories on public.categories;
drop policy if exists public_settings on public.settings;

-- These permissive legacy policies superseded the stricter active-status
-- policies because PostgreSQL combines permissive policies with OR.
drop policy if exists "Allow public read published products" on public.products;
drop policy if exists "Public read product images" on public.product_images;

-- Admin-only cart policies should target authenticated admins, not PUBLIC.
drop policy if exists "Admin full access carts" on public.carts;
drop policy if exists "Admin full access cart_items" on public.cart_items;
