ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_request_id UUID,
  ADD COLUMN IF NOT EXISTS customer_email_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_division VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_request_id
  ON public.orders(checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS compare_at_price_snapshot DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS warranty_policy_snapshot TEXT;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NOT NULL,
  change_amount INTEGER NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stock_movements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_movements TO service_role;
