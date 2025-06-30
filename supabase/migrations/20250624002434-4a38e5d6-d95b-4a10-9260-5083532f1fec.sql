

-- Create a storage bucket for mobile home images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mobile-home-images',
  'mobile-home-images', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create storage policies for the bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'mobile-home-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'mobile-home-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'mobile-home-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'mobile-home-images' 
  AND auth.role() = 'authenticated'
);

