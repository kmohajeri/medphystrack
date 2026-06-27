-- ============================================================
-- MedPhysTrack — Migration 006
-- Run AFTER 005_module_evaluation_workflow.sql
--
-- Creates RLS policies for the 'evaluation-files' Storage bucket.
--
-- !! MANUAL STEP REQUIRED !!
-- Before running this file, create the Storage bucket in the
-- Supabase dashboard (or via Management API):
--
--   Name:   evaluation-files
--   Public: false  (private bucket)
--
-- Path convention inside the bucket:
--   {program_id}/{resident_id}/{evaluation_id}/{filename}
--   (resident_id = residents.id, NOT auth.uid())
--
-- These policies are on storage.objects, not a user table,
-- so they run under the Postgres storage schema.
-- ============================================================

-- Super admin: full access to all evaluation files
CREATE POLICY "super_admin: full access to evaluation-files storage"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'evaluation-files'
    AND get_my_role() = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'evaluation-files'
    AND get_my_role() = 'super_admin'
  );

-- Resident: upload + read + delete their own files,
-- but only while the evaluation has not been faculty-signed.
-- Path segment [3] (1-indexed) = evaluation_id.
CREATE POLICY "resident: manage own evaluation files before sign-off"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'evaluation-files'
    AND (storage.foldername(name))[3] IN (
      SELECT me.id::text
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.user_id = auth.uid()
        AND  me.faculty_signed_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'evaluation-files'
    AND (storage.foldername(name))[3] IN (
      SELECT me.id::text
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.user_id = auth.uid()
        AND  me.faculty_signed_at IS NULL
    )
  );

-- Resident: read-only access to their own files after sign-off
CREATE POLICY "resident: read own evaluation files after sign-off"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'evaluation-files'
    AND (storage.foldername(name))[3] IN (
      SELECT me.id::text
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.user_id = auth.uid()
    )
  );

-- Program admin: read files belonging to their program.
-- Path segment [1] (1-indexed) = program_id.
-- programs.org_id is UNIQUE (enforced in migration 007), so this is safe.
CREATE POLICY "program_admin: read evaluation files in own program"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'evaluation-files'
    AND get_my_role() = 'program_admin'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM   public.programs p
      WHERE  p.org_id = get_my_org_id()
    )
  );

-- Program admin: delete files belonging to their program (admin cleanup)
CREATE POLICY "program_admin: delete evaluation files in own program"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'evaluation-files'
    AND get_my_role() = 'program_admin'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM   public.programs p
      WHERE  p.org_id = get_my_org_id()
    )
  );
