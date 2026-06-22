-- Migration: Mirror duration_weeks/year/cases_required onto the
--            per-program copy tables (modules, tasks) so the
--            copy-on-provision pattern has somewhere to write them.
-- Purpose: Phase 4 prep — keep template_modules/modules and
--          template_tasks/tasks structurally identical (minus the
--          template_module_id / template_task_id lineage columns).
-- Date: 2026-06-21

ALTER TABLE modules
    ADD COLUMN IF NOT EXISTS duration_weeks integer,
    ADD COLUMN IF NOT EXISTS year integer;

COMMENT ON COLUMN modules.duration_weeks IS
    'Approximate module duration in weeks. Copied from template_modules.duration_weeks on provisioning; editable per-program thereafter.';

COMMENT ON COLUMN modules.year IS
    'Training year (1 or 2) the module belongs to. Copied from template_modules.year on provisioning; editable per-program thereafter.';

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS cases_required integer;

COMMENT ON COLUMN tasks.cases_required IS
    'Number of clinical cases required to complete this task. Copied from template_tasks.cases_required on provisioning; editable per-program thereafter.';

-- Mirror the same task_type enforcement on the per-program tasks table
ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS tasks_task_type_check;

ALTER TABLE tasks
    ADD CONSTRAINT tasks_task_type_check
    CHECK (task_type IN ('clinical', 'reading'));
