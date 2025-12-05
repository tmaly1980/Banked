-- Storage Policies for purchase-photos bucket
-- Run this SQL in your Supabase SQL Editor

-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-photos', 'purchase-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own purchase photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own purchase photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own purchase photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view purchase photos" ON storage.objects;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own purchase photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'purchase-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own purchase photos
CREATE POLICY "Users can view their own purchase photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'purchase-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own purchase photos
CREATE POLICY "Users can delete their own purchase photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'purchase-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional: Allow public viewing if bucket is public
-- Remove this if you want photos to be private
CREATE POLICY "Public can view purchase photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'purchase-photos');
