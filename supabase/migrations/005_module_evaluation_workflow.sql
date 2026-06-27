-- ============================================================
-- MedPhysTrack — Migration 005
-- Run AFTER 004_mirror_fields_to_program_tables.sql
--
-- Covers two areas that were applied to the database together:
--
-- 1. Archive/status columns on organizations and programs
--    (no separate migration file existed for these)
--
-- 2. Module evaluation workflow revamp:
--    - Revamps module_evaluations columns
--    - Adds evaluation_files table + RLS
--    - Adds started_at / completed_at to resident_modules
-- ============================================================


-- ============================================================
-- PART 1: ARCHIVE STATUS FOR ORGANIZATIONS AND PROGRAMS
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN status     text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'archived')),
  ADD COLUMN archived_at timestamptz;

ALTER TABLE public.programs
  ADD COLUMN status     text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'archived')),
  ADD COLUMN archived_at timestamptz;

-- Trigger function: auto-set archived_at when status flips to/from 'archived'
CREATE OR REPLACE FUNCTION public.set_archived_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'archived' AND (OLD.status IS DISTINCT FROM 'archived') THEN
    NEW.archived_at = now();
  ELSIF NEW.status != 'archived' AND OLD.status = 'archived' THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_archived_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_archived_at();

CREATE TRIGGER set_archived_at_programs
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.set_archived_at();


-- ============================================================
-- PART 2: MODULE EVALUATION WORKFLOW
-- ============================================================

-- ── resident_modules: add rotation date tracking ─────────────

ALTER TABLE public.resident_modules
  ADD COLUMN started_at   timestamptz,
  ADD COLUMN completed_at timestamptz;


-- ── module_evaluations: revamp columns ───────────────────────
--
-- Original integer (1-5) scores → booleans / text / dropped.
-- Safest approach on a potentially empty table: drop and re-add.

ALTER TABLE public.module_evaluations
  DROP COLUMN IF EXISTS competencies_score,
  DROP COLUMN IF EXISTS reading_score,
  DROP COLUMN IF EXISTS engagement_score,
  DROP COLUMN IF EXISTS oral_exam_score,
  DROP COLUMN IF EXISTS comments;

ALTER TABLE public.module_evaluations
  ADD COLUMN competencies_score         boolean,
  ADD COLUMN reading_score              boolean,
  ADD COLUMN engaged_with_mentors_staff boolean,
  ADD COLUMN oral_exam_score            text
               CHECK (oral_exam_score IN ('pass', 'conditional_pass', 'fail')),
  ADD COLUMN faculty_comments           text,
  ADD COLUMN resident_comments          text;


-- ── evaluation_files: new table ──────────────────────────────
--
-- Stores presentation slides and supplementary docs that the
-- resident uploads before their module oral exam.
-- Path convention in the 'evaluation-files' Storage bucket:
--   {program_id}/{resident_id}/{evaluation_id}/{filename}
-- (resident_id = residents.id, NOT auth.uid())

CREATE TABLE public.evaluation_files (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  uuid        NOT NULL
                               REFERENCES public.module_evaluations(id) ON DELETE CASCADE,
  file_type      text        NOT NULL
                               CHECK (file_type IN ('presentation', 'supplementary')),
  file_name      text        NOT NULL,
  storage_path   text        NOT NULL,
  uploaded_by    uuid        NOT NULL
                               REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.evaluation_files (evaluation_id);


-- ── evaluation_files: RLS ────────────────────────────────────

ALTER TABLE public.evaluation_files ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "super_admin: full access to evaluation_files"
  ON public.evaluation_files
  FOR ALL
  USING (get_my_role() = 'super_admin');

-- Resident: read own files (always — even after faculty sign-off, for reference)
CREATE POLICY "resident: read own evaluation files"
  ON public.evaluation_files
  FOR SELECT
  USING (
    evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.user_id = auth.uid()
    )
  );

-- Resident: insert own files only while faculty has not yet signed off
CREATE POLICY "resident: upload own evaluation files before faculty sign-off"
  ON public.evaluation_files
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.user_id = auth.uid()
        AND  me.faculty_signed_at IS NULL
    )
  );

-- Resident: delete own files only while faculty has not yet signed off
CREATE POLICY "resident: delete own evaluation files before faculty sign-off"
  ON public.evaluation_files
  FOR DELETE
  USING (
    evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.user_id = auth.uid()
        AND  me.faculty_signed_at IS NULL
    )
  );

-- Program admin: SELECT on files in their program (for records / audit)
CREATE POLICY "program_admin: read evaluation files in own program"
  ON public.evaluation_files
  FOR SELECT
  USING (
    evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.org_id = get_my_org_id()
    )
  );

-- Program admin: DELETE on files in their program (admin cleanup only)
CREATE POLICY "program_admin: delete evaluation files in own program"
  ON public.evaluation_files
  FOR DELETE
  USING (
    evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.org_id = get_my_org_id()
    )
  );
