-- ============================================================
-- MedPhysTrack — Migration 013
-- Fix missing get_my_role() guard on evaluation_files
-- program_admin policies (created in migration 005).
--
-- Without the role guard, a resident whose profile has org_id
-- set (migration 010) could match the program_admin DELETE
-- policy and delete other residents' evaluation files.
-- ============================================================

DROP POLICY IF EXISTS "program_admin: read evaluation files in own program" ON public.evaluation_files;
CREATE POLICY "program_admin: read evaluation files in own program"
  ON public.evaluation_files
  FOR SELECT
  USING (
    get_my_role() = 'program_admin' AND
    evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.org_id = get_my_org_id()
    )
  );

DROP POLICY IF EXISTS "program_admin: delete evaluation files in own program" ON public.evaluation_files;
CREATE POLICY "program_admin: delete evaluation files in own program"
  ON public.evaluation_files
  FOR DELETE
  USING (
    get_my_role() = 'program_admin' AND
    evaluation_id IN (
      SELECT me.id
      FROM   public.module_evaluations me
      JOIN   public.residents r ON r.id = me.resident_id
      WHERE  r.org_id = get_my_org_id()
    )
  );
