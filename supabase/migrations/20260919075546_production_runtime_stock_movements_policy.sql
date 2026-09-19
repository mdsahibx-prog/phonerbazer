DROP POLICY IF EXISTS "Service role full access stock movements" ON public.stock_movements;
CREATE POLICY "Service role full access stock movements"
ON public.stock_movements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
