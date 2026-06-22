-- 008_provision_program_rpc.sql
-- Phase 4: Program Management (Admin)
--
-- Implements the copy-on-provision pattern as a single atomic Postgres
-- function. This is called by the Super Admin's "Create Program" flow.
-- It must run as one transaction: if anything fails partway through
-- (e.g. a task copy errors out), the whole provision rolls back —
-- we never want a program with modules but no tasks, or a program
-- row with no curriculum at all.
--
-- Organization creation is a plain client-side insert (RLS-protected,
-- single table, no atomicity concerns). This RPC only covers the
-- program + curriculum-copy step.

CREATE OR REPLACE FUNCTION provision_program(
  p_org_id uuid,
  p_program_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
BEGIN
  -- Authorization: only super admins provision programs
  IF get_my_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can provision programs';
  END IF;

  IF p_program_name IS NULL OR length(trim(p_program_name)) = 0 THEN
    RAISE EXCEPTION 'Program name is required';
  END IF;

  -- programs.org_id is UNIQUE — fail with a clear message instead of
  -- a raw constraint-violation error
  IF EXISTS (SELECT 1 FROM programs WHERE org_id = p_org_id) THEN
    RAISE EXCEPTION 'This organization already has a program';
  END IF;

  -- 1. Create the program
  INSERT INTO programs (org_id, name)
  VALUES (p_org_id, p_program_name)
  RETURNING id INTO v_program_id;

  -- 2. Map template_modules.id -> new modules.id so tasks can be
  --    re-pointed at the new module rows instead of the template rows
  CREATE TEMP TABLE module_id_map (
    template_module_id uuid PRIMARY KEY,
    new_module_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO module_id_map (template_module_id, new_module_id)
  SELECT tm.id, gen_random_uuid()
  FROM template_modules tm;

  -- 3. Copy modules
  INSERT INTO modules (id, program_id, name, description, order_index, duration_weeks, year)
  SELECT
    mm.new_module_id,
    v_program_id,
    tm.name,
    tm.description,
    tm.order_index,
    tm.duration_weeks,
    tm.year
  FROM template_modules tm
  JOIN module_id_map mm ON mm.template_module_id = tm.id;

  -- 4. Copy tasks, re-pointed at the new module ids
  INSERT INTO tasks (module_id, name, description, resource_url, is_required, order_index, task_type, cases_required)
  SELECT
    mm.new_module_id,
    tt.name,
    tt.description,
    tt.resource_url,
    tt.is_required,
    tt.order_index,
    tt.task_type,
    tt.cases_required
  FROM template_tasks tt
  JOIN module_id_map mm ON mm.template_module_id = tt.module_id;

  RETURN v_program_id;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_program(uuid, text) TO authenticated;

COMMENT ON FUNCTION provision_program(uuid, text) IS
  'Atomically creates a program for an org and copies the stock template_modules/template_tasks curriculum into modules/tasks (copy-on-provision). Super admin only.';
