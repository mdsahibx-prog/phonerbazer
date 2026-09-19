DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='storage' AND table_name='buckets'
      AND column_name IN ('public','file_size_limit','allowed_mime_types')
    GROUP BY table_schema, table_name HAVING COUNT(*)=3
  ) THEN
    INSERT INTO storage.buckets (id,name,"public",file_size_limit,allowed_mime_types)
    VALUES
      ('product-images','product-images',true,5242880,ARRAY['image/jpeg','image/png','image/webp','image/avif']),
      ('brand-logos','brand-logos',true,2097152,ARRAY['image/svg+xml','image/png','image/webp','image/jpeg']),
      ('landing-pages','landing-pages',true,8388608,ARRAY['image/jpeg','image/png','image/webp','image/avif'])
    ON CONFLICT (id) DO UPDATE SET
      "public"=EXCLUDED."public",
      file_size_limit=EXCLUDED.file_size_limit,
      allowed_mime_types=EXCLUDED.allowed_mime_types;
  END IF;
END $$;

DROP POLICY IF EXISTS "Public read product image objects" ON storage.objects;
CREATE POLICY "Public read product image objects" ON storage.objects FOR SELECT USING (bucket_id='product-images');
DROP POLICY IF EXISTS "Public read brand logo objects" ON storage.objects;
CREATE POLICY "Public read brand logo objects" ON storage.objects FOR SELECT USING (bucket_id='brand-logos');
DROP POLICY IF EXISTS "Public read landing page media" ON storage.objects;
CREATE POLICY "Public read landing page media" ON storage.objects FOR SELECT USING (bucket_id='landing-pages');
DROP POLICY IF EXISTS "Owner or admin manage product image objects" ON storage.objects;
CREATE POLICY "Owner or admin manage product image objects" ON storage.objects FOR ALL TO authenticated USING (bucket_id='product-images' AND private.has_role(ARRAY['OWNER','ADMIN'])) WITH CHECK (bucket_id='product-images' AND private.has_role(ARRAY['OWNER','ADMIN']));
DROP POLICY IF EXISTS "Owner or admin manage brand logo objects" ON storage.objects;
CREATE POLICY "Owner or admin manage brand logo objects" ON storage.objects FOR ALL TO authenticated USING (bucket_id='brand-logos' AND private.has_role(ARRAY['OWNER','ADMIN'])) WITH CHECK (bucket_id='brand-logos' AND private.has_role(ARRAY['OWNER','ADMIN']));
DROP POLICY IF EXISTS "Owner or admin manage landing page media" ON storage.objects;
CREATE POLICY "Owner or admin manage landing page media" ON storage.objects FOR ALL TO authenticated USING (bucket_id='landing-pages' AND private.has_role(ARRAY['OWNER','ADMIN'])) WITH CHECK (bucket_id='landing-pages' AND private.has_role(ARRAY['OWNER','ADMIN']));
