-- 009_assign_curriculum_rpc.sql
-- Phase 5: Resident Management (Admin)
--
-- 1. assign_curriculum RPC — atomically creates per-resident module and task
--    instances from the program's existing modules/tasks.  Same copy-on-assign
--    pattern described in CLAUDE.md.  Super admin and program admin only.
--    Guarded against double-assignment.
--
-- 2. application-files Storage RLS — policies for the private
--    "application-files" bucket (must be created manually in the Supabase
--    dashboard before these policies take effect).
--    Path convention: {program_id}/{application_id}/{filename}

-- ============================================================
-- assign_curriculum RPC
-- ============================================================

CREATE OR REPLACE FUNCTION assign_curriculum(p_resident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
BEGIN
  IF get_my_role() NOT IN ('super_admin', 'program_admin') THEN
    RAISE EXCEPTION 'Only admins can assign curriculum';
  END IF;

  SELECT program_id INTO v_program_id
  FROM residents WHERE id = p_resident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resident not found';
  END IF;

  IF EXISTS (SELECT 1 FROM resident_modules WHERE resident_id = p_resident_id LIMIT 1) THEN
    RAISE EXCEPTION 'Curriculum already assigned to this resident';
  END IF;

  -- Insert resident_modules and use their returned IDs to build resident_tasks
  -- in a single atomic statement.
  WITH inserted_modules AS (
    INSERT INTO resident_modules (resident_id, module_id)
    SELECT p_resident_id, m.id
    FROM modules m
    WHERE m.program_id = v_program_id
    RETURNING id, module_id
  )
  INSERT INTO resident_tasks (resident_id, task_id, resident_module_id)
  SELECT p_resident_id, t.id, im.id
  FROM tasks t
  JOIN inserted_modules im ON im.module_id = t.module_id;

END;
$$;

GRANT EXECUTE ON FUNCTION assign_curriculum(uuid) TO authenticated;

COMMENT ON FUNCTION assign_curriculum(uuid) IS
  'Atomically creates resident_modules + resident_tasks from program modules/tasks (copy-on-assign). Admin only. Guards against double-assignment.';

-- ============================================================
-- application-files Storage RLS
-- Requires manual bucket creation:
--   Supabase dashboard → Storage → New bucket
--   Name: application-files, Public: off
-- ============================================================

CREATE POLICY "super_admin: full access to application files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'application-files'
    AND get_my_role() = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'application-files'
    AND get_my_role() = 'super_admin'
  );

CREATE POLICY "program_admin: manage own program application files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'application-files'
    AND get_my_role() = 'program_admin'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM public.programs p
      WHERE p.org_id = get_my_org_id()
    )
  )
  WITH CHECK (
    bucket_id = 'application-files'
    AND get_my_role() = 'program_admin'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM public.programs p
      WHERE p.org_id = get_my_org_id()
    )
  );
