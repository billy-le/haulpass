INSERT INTO storage.buckets (id, name, public)
VALUES ('haul-images', 'haul-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload haul images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'haul-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view haul images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'haul-images');
