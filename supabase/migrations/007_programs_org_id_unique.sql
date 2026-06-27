-- ============================================================
-- MedPhysTrack — Migration 007
-- Run AFTER 006_evaluation_files_storage.sql
--
-- Enforces the 1:1 org-to-program invariant.
--
-- Several RLS policies (including storage policies in 006) use
-- the programs.org_id → programs.id path to scope data access.
-- The UNIQUE constraint guarantees that subqueries on this path
-- return at most one row and can never cross org boundaries.
--
-- Do not relax this constraint without revisiting those policies.
-- ============================================================

ALTER TABLE public.programs
  ADD CONSTRAINT programs_org_id_unique UNIQUE (org_id);
