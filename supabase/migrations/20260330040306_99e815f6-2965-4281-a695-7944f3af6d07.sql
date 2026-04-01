
-- Create storage bucket for screen recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('recordings', 'recordings', false, 104857600);

-- RLS: Only dispatchers/admins can upload
CREATE POLICY "Dispatchers can upload recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recordings' AND public.is_dispatcher()
);

-- RLS: Only admins can view recordings
CREATE POLICY "Admins can view recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin')
);

-- RLS: Only admins can delete recordings
CREATE POLICY "Admins can delete recordings"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin')
);
