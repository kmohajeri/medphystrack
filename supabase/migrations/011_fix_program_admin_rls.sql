-- ============================================================
-- Migration 011: Fix program_admin RLS policies
--
-- Root cause: migration 010 started setting org_id on resident
-- profiles. The program_admin "full access to own org" policies
-- in migration 002 use org_id = get_my_org_id() with no role
-- check, so residents with a matching org_id were incorrectly
-- matching those policies (e.g. seeing all residents' modules).
--
-- Fix: add get_my_role() = 'program_admin' guard to every
-- program_admin policy that was written without one.
-- ============================================================

-- PROFILES
DROP POLICY IF EXISTS "program_admin: view profiles in own org" ON public.profiles;
CREATE POLICY "program_admin: view profiles in own org"
  ON public.profiles FOR SELECT
  USING (get_my_role() = 'program_admin' AND org_id = get_my_org_id());

-- PROGRAMS
DROP POLICY IF EXISTS "program_admin: full access to own org programs" ON public.programs;
CREATE POLICY "program_admin: full access to own org programs"
  ON public.programs FOR ALL
  USING (get_my_role() = 'program_admin' AND org_id = get_my_org_id());

-- MODULES
DROP POLICY IF EXISTS "program_admin: full access to own org modules" ON public.modules;
CREATE POLICY "program_admin: full access to own org modules"
  ON public.modules FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    program_id IN (
      SELECT id FROM public.programs WHERE org_id = get_my_org_id()
    )
  );

-- TASKS
DROP POLICY IF EXISTS "program_admin: full access to own org tasks" ON public.tasks;
CREATE POLICY "program_admin: full access to own org tasks"
  ON public.tasks FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    module_id IN (
      SELECT m.id FROM public.modules m
      JOIN public.programs p ON p.id = m.program_id
      WHERE p.org_id = get_my_org_id()
    )
  );

-- RESIDENTS
DROP POLICY IF EXISTS "program_admin: full access to own org residents" ON public.residents;
CREATE POLICY "program_admin: full access to own org residents"
  ON public.residents FOR ALL
  USING (get_my_role() = 'program_admin' AND org_id = get_my_org_id());

-- RESIDENT MODULES
DROP POLICY IF EXISTS "program_admin: full access to own org resident_modules" ON public.resident_modules;
CREATE POLICY "program_admin: full access to own org resident_modules"
  ON public.resident_modules FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    resident_id IN (
      SELECT id FROM public.residents WHERE org_id = get_my_org_id()
    )
  );

-- RESIDENT TASKS
DROP POLICY IF EXISTS "program_admin: full access to own org resident_tasks" ON public.resident_tasks;
CREATE POLICY "program_admin: full access to own org resident_tasks"
  ON public.resident_tasks FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    resident_id IN (
      SELECT id FROM public.residents WHERE org_id = get_my_org_id()
    )
  );

-- COMMITTEE MEMBERS
DROP POLICY IF EXISTS "program_admin: full access to own org committee_members" ON public.committee_members;
CREATE POLICY "program_admin: full access to own org committee_members"
  ON public.committee_members FOR ALL
  USING (get_my_role() = 'program_admin' AND org_id = get_my_org_id());

-- COMMITTEE MINUTES
DROP POLICY IF EXISTS "program_admin: full access to own org committee_minutes" ON public.committee_minutes;
CREATE POLICY "program_admin: full access to own org committee_minutes"
  ON public.committee_minutes FOR ALL
  USING (get_my_role() = 'program_admin' AND org_id = get_my_org_id());

-- MINUTES MEMBERS
DROP POLICY IF EXISTS "program_admin: full access to own org minutes_members" ON public.minutes_members;
CREATE POLICY "program_admin: full access to own org minutes_members"
  ON public.minutes_members FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    minutes_id IN (
      SELECT id FROM public.committee_minutes WHERE org_id = get_my_org_id()
    )
  );

-- MINUTES FILES
DROP POLICY IF EXISTS "program_admin: full access to own org minutes_files" ON public.minutes_files;
CREATE POLICY "program_admin: full access to own org minutes_files"
  ON public.minutes_files FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    minutes_id IN (
      SELECT id FROM public.committee_minutes WHERE org_id = get_my_org_id()
    )
  );

-- MODULE EVALUATIONS
DROP POLICY IF EXISTS "program_admin: full access to own org module_evaluations" ON public.module_evaluations;
CREATE POLICY "program_admin: full access to own org module_evaluations"
  ON public.module_evaluations FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    resident_id IN (
      SELECT id FROM public.residents WHERE org_id = get_my_org_id()
    )
  );

-- APPLICATION FILES (added in Phase 5)
DROP POLICY IF EXISTS "program_admin: full access to own org application_files" ON public.application_files;
CREATE POLICY "program_admin: full access to own org application_files"
  ON public.application_files FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    application_id IN (
      SELECT id FROM public.applications WHERE org_id = get_my_org_id()
    )
  );

-- INQUIRY LOGS
DROP POLICY IF EXISTS "program_admin: full access to own org inquiry_logs" ON public.inquiry_logs;
CREATE POLICY "program_admin: full access to own org inquiry_logs"
  ON public.inquiry_logs FOR ALL
  USING (
    get_my_role() = 'program_admin' AND
    application_id IN (
      SELECT id FROM public.applications WHERE org_id = get_my_org_id()
    )
  );

-- APPLICATIONS
DROP POLICY IF EXISTS "program_admin: full access to own org applications" ON public.applications;
CREATE POLICY "program_admin: full access to own org applications"
  ON public.applications FOR ALL
  USING (get_my_role() = 'program_admin' AND org_id = get_my_org_id());
