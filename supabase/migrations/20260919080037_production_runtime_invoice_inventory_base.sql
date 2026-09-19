CREATE TABLE IF NOT EXISTS public.imei_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NOT NULL,
  imei_1 VARCHAR(100) UNIQUE NOT NULL,
  imei_2 VARCHAR(100),
  serial_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'in_stock' NOT NULL,
  order_id UUID,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_imei_order') THEN
    ALTER TABLE public.imei_inventory ADD CONSTRAINT fk_imei_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_total DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (discount_total >= 0),
  delivery_charge DECIMAL(10,2) NOT NULL CHECK (delivery_charge >= 0),
  grand_total DECIMAL(10,2) NOT NULL CHECK (grand_total >= 0),
  issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  variant_title_snapshot VARCHAR(255) NOT NULL,
  imei_snapshot VARCHAR(100),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total DECIMAL(10,2) NOT NULL CHECK (line_total >= 0)
);
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.imei_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.imei_inventory, public.invoices, public.invoice_items, public.audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.imei_inventory, public.invoices, public.invoice_items, public.audit_logs TO service_role;