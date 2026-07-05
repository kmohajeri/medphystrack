-- ============================================================
-- MedPhysTrack — Migration 012
-- Storage RLS policies for the 'minutes-files' bucket.
--
-- !! MANUAL STEP REQUIRED !!
-- Create the Storage bucket in Supabase dashboard first:
--   Name:   minutes-files
--   Public: false  (private bucket)
--
-- Path convention: {program_id}/{minutes_id}/{timestamp}_{filename}
-- Path segment [1] (1-indexed) = program_id
-- ============================================================

-- Super admin: full access
CREATE POLICY "super_admin: full access to minutes-files storage"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'minutes-files'
    AND get_my_role() = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'minutes-files'
    AND get_my_role() = 'super_admin'
  );

-- Program admin: full access to files in their own program
CREATE POLICY "program_admin: full access to own minutes-files storage"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'minutes-files'
    AND get_my_role() = 'program_admin'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM   public.programs p
      WHERE  p.org_id = get_my_org_id()
    )
  )
  WITH CHECK (
    bucket_id = 'minutes-files'
    AND get_my_role() = 'program_admin'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM   public.programs p
      WHERE  p.org_id = get_my_org_id()
    )
  );
