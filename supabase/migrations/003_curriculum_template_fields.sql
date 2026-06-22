-- Migration: Add duration_weeks, year to template_modules
--            Add cases_required to template_tasks
-- Purpose: Support structured curriculum seed data (Phase 4 prep)
-- Date: 2026-06-21

ALTER TABLE template_modules
    ADD COLUMN IF NOT EXISTS duration_weeks integer,
    ADD COLUMN IF NOT EXISTS year integer;

COMMENT ON COLUMN template_modules.duration_weeks IS
    'Approximate module duration in weeks (e.g. 2-month rotation = 8 weeks). Nullable for modules without a fixed duration.';

COMMENT ON COLUMN template_modules.year IS
    'Training year the module belongs to (1 or 2). Orientation is counted as year 1.';

ALTER TABLE template_tasks
    ADD COLUMN IF NOT EXISTS cases_required integer;

COMMENT ON COLUMN template_tasks.cases_required IS
    'Number of clinical cases required to complete this task (e.g. 2 for "two or more HDR breast cases"). Null for reading tasks or clinical tasks without a case count.';

-- Drop the existing auto-named constraint from 001_initial_schema.sql
-- (inline CHECK created as template_tasks_task_type_check by PostgreSQL)
ALTER TABLE template_tasks
    DROP CONSTRAINT IF EXISTS template_tasks_task_type_check;

-- Enforce task_type at the DB level to the two values in use
ALTER TABLE template_tasks
    ADD CONSTRAINT template_tasks_task_type_check
    CHECK (task_type IN ('clinical', 'reading'));
