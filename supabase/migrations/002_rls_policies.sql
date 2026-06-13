-- ============================================================
-- MedPhysTrack — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
--
-- Rules:
--   super_admin  → full access to everything
--   program_admin → full access within their org only
--   resident      → read-only on their program's curriculum;
--                   read/write on their own progress records
-- ============================================================

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

alter table public.organizations enable row level security;

create policy "super_admin: full access to organizations"
  on public.organizations
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: view own org"
  on public.organizations
  for select
  using (id = get_my_org_id());

create policy "resident: view own org"
  on public.organizations
  for select
  using (id = get_my_org_id());

-- ============================================================
-- PROFILES
-- ============================================================

alter table public.profiles enable row level security;

create policy "super_admin: full access to profiles"
  on public.profiles
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: view profiles in own org"
  on public.profiles
  for select
  using (org_id = get_my_org_id());

create policy "users: view and update own profile"
  on public.profiles
  for all
  using (id = auth.uid());

-- ============================================================
-- PROGRAMS
-- ============================================================

alter table public.programs enable row level security;

create policy "super_admin: full access to programs"
  on public.programs
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org programs"
  on public.programs
  for all
  using (org_id = get_my_org_id());

create policy "resident: view own org programs"
  on public.programs
  for select
  using (org_id = get_my_org_id());

-- ============================================================
-- TEMPLATE MODULES & TASKS (super admin write, others read)
-- ============================================================

alter table public.template_modules enable row level security;

create policy "super_admin: full access to template_modules"
  on public.template_modules
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: read template_modules"
  on public.template_modules
  for select
  using (get_my_role() = 'program_admin');

create policy "resident: read template_modules"
  on public.template_modules
  for select
  using (get_my_role() = 'resident');

alter table public.template_tasks enable row level security;

create policy "super_admin: full access to template_tasks"
  on public.template_tasks
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: read template_tasks"
  on public.template_tasks
  for select
  using (get_my_role() = 'program_admin');

create policy "resident: read template_tasks"
  on public.template_tasks
  for select
  using (get_my_role() = 'resident');

-- ============================================================
-- MODULES
-- ============================================================

alter table public.modules enable row level security;

create policy "super_admin: full access to modules"
  on public.modules
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org modules"
  on public.modules
  for all
  using (
    program_id in (
      select id from public.programs where org_id = get_my_org_id()
    )
  );

create policy "resident: read modules in own program"
  on public.modules
  for select
  using (
    program_id in (
      select program_id from public.residents where user_id = auth.uid()
    )
  );

-- ============================================================
-- TASKS
-- ============================================================

alter table public.tasks enable row level security;

create policy "super_admin: full access to tasks"
  on public.tasks
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org tasks"
  on public.tasks
  for all
  using (
    module_id in (
      select m.id from public.modules m
      join public.programs p on p.id = m.program_id
      where p.org_id = get_my_org_id()
    )
  );

create policy "resident: read tasks in own program"
  on public.tasks
  for select
  using (
    module_id in (
      select m.id from public.modules m
      join public.residents r on r.program_id = m.program_id
      where r.user_id = auth.uid()
    )
  );

-- ============================================================
-- RESIDENTS
-- ============================================================

alter table public.residents enable row level security;

create policy "super_admin: full access to residents"
  on public.residents
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org residents"
  on public.residents
  for all
  using (org_id = get_my_org_id());

create policy "resident: view own resident record"
  on public.residents
  for select
  using (user_id = auth.uid());

-- ============================================================
-- RESIDENT MODULES
-- ============================================================

alter table public.resident_modules enable row level security;

create policy "super_admin: full access to resident_modules"
  on public.resident_modules
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org resident_modules"
  on public.resident_modules
  for all
  using (
    resident_id in (
      select id from public.residents where org_id = get_my_org_id()
    )
  );

create policy "resident: view own resident_modules"
  on public.resident_modules
  for select
  using (
    resident_id in (
      select id from public.residents where user_id = auth.uid()
    )
  );

-- ============================================================
-- RESIDENT TASKS
-- ============================================================

alter table public.resident_tasks enable row level security;

create policy "super_admin: full access to resident_tasks"
  on public.resident_tasks
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org resident_tasks"
  on public.resident_tasks
  for all
  using (
    resident_id in (
      select id from public.residents where org_id = get_my_org_id()
    )
  );

create policy "resident: view and update own resident_tasks"
  on public.resident_tasks
  for all
  using (
    resident_id in (
      select id from public.residents where user_id = auth.uid()
    )
  );

-- ============================================================
-- APPLICATIONS
-- ============================================================

alter table public.applications enable row level security;

create policy "super_admin: full access to applications"
  on public.applications
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org applications"
  on public.applications
  for all
  using (org_id = get_my_org_id());

alter table public.application_files enable row level security;

create policy "super_admin: full access to application_files"
  on public.application_files
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org application_files"
  on public.application_files
  for all
  using (
    application_id in (
      select id from public.applications where org_id = get_my_org_id()
    )
  );

alter table public.inquiry_logs enable row level security;

create policy "super_admin: full access to inquiry_logs"
  on public.inquiry_logs
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org inquiry_logs"
  on public.inquiry_logs
  for all
  using (
    application_id in (
      select id from public.applications where org_id = get_my_org_id()
    )
  );

-- ============================================================
-- STEERING COMMITTEE
-- ============================================================

alter table public.committee_members enable row level security;

create policy "super_admin: full access to committee_members"
  on public.committee_members
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org committee_members"
  on public.committee_members
  for all
  using (org_id = get_my_org_id());

alter table public.committee_minutes enable row level security;

create policy "super_admin: full access to committee_minutes"
  on public.committee_minutes
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org committee_minutes"
  on public.committee_minutes
  for all
  using (org_id = get_my_org_id());

alter table public.minutes_members enable row level security;

create policy "super_admin: full access to minutes_members"
  on public.minutes_members
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org minutes_members"
  on public.minutes_members
  for all
  using (
    minutes_id in (
      select id from public.committee_minutes where org_id = get_my_org_id()
    )
  );

alter table public.minutes_files enable row level security;

create policy "super_admin: full access to minutes_files"
  on public.minutes_files
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org minutes_files"
  on public.minutes_files
  for all
  using (
    minutes_id in (
      select id from public.committee_minutes where org_id = get_my_org_id()
    )
  );

-- ============================================================
-- MODULE EVALUATIONS
-- ============================================================

alter table public.module_evaluations enable row level security;

create policy "super_admin: full access to module_evaluations"
  on public.module_evaluations
  for all
  using (get_my_role() = 'super_admin');

create policy "program_admin: full access to own org module_evaluations"
  on public.module_evaluations
  for all
  using (
    resident_id in (
      select id from public.residents where org_id = get_my_org_id()
    )
  );

create policy "resident: view own evaluations and acknowledge"
  on public.module_evaluations
  for all
  using (
    resident_id in (
      select id from public.residents where user_id = auth.uid()
    )
  );
