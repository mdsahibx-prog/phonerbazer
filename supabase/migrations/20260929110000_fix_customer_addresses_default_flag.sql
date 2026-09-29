-- Cart checkout requires the customer address default flag when creating
-- the address snapshot. Keep the column non-null with a safe default so
-- existing addresses remain valid and the server-authoritative cart RPC can
-- create new customer addresses atomically.
ALTER TABLE public.customer_addresses
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
