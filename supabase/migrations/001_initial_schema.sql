-- ============================================================
-- MedPhysTrack — Initial Schema
-- Run this in your Supabase SQL editor to set up the database.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users — one row per user)
-- ============================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete set null,
  -- FIX: role is nullable so handle_new_user() can create the row on signup;
  -- role is assigned by an admin afterward.
  role        text check (role in ('super_admin', 'program_admin', 'resident')),
  first_name  text,
  last_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- HELPER: current user's profile (used in RLS policies)
-- FIX: moved to after public.profiles is created — LANGUAGE SQL
-- functions validate their body at creation time, so referencing
-- public.profiles before the table exists aborts the entire script.
-- ============================================================

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- PROGRAMS (residency programs within an org)
-- ============================================================

create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TEMPLATE LIBRARY (managed by super admin only)
-- ============================================================

create table public.template_modules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.template_tasks (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.template_modules(id) on delete cascade,
  name        text not null,
  task_type   text not null check (task_type in ('clinical', 'didactic')),
  description text,
  resource_url text,
  is_required boolean not null default true,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- MODULES (copied from template when program is provisioned)
-- ============================================================

create table public.modules (
  id                  uuid primary key default gen_random_uuid(),
  program_id          uuid not null references public.programs(id) on delete cascade,
  template_module_id  uuid references public.template_modules(id) on delete set null,
  name                text not null,
  description         text,
  order_index         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- TASKS (copied from template, owned by a module)
-- ============================================================

create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  module_id           uuid not null references public.modules(id) on delete cascade,
  template_task_id    uuid references public.template_tasks(id) on delete set null,
  name                text not null,
  task_type           text not null check (task_type in ('clinical', 'didactic')),
  description         text,
  resource_url        text,
  is_required         boolean not null default true,
  order_index         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- RESIDENTS
-- ============================================================

create table public.residents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  program_id  uuid not null references public.programs(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  start_date  date,
  end_date    date,
  status      text not null default 'active' check (status in ('active', 'inactive', 'graduated')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- RESIDENT MODULES (per-resident module assignment)
-- ============================================================

create table public.resident_modules (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  module_id   uuid not null references public.modules(id) on delete cascade,
  status      text not null default 'not_started'
                check (status in ('not_started', 'in_progress', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (resident_id, module_id)
);

-- ============================================================
-- RESIDENT TASKS (per-resident task instances — copy-on-assign)
-- ============================================================

create table public.resident_tasks (
  id                 uuid primary key default gen_random_uuid(),
  resident_id        uuid not null references public.residents(id) on delete cascade,
  task_id            uuid not null references public.tasks(id) on delete cascade,
  resident_module_id uuid not null references public.resident_modules(id) on delete cascade,
  status             text not null default 'not_started'
                       check (status in ('not_started', 'in_progress', 'completed', 'not_applicable')),
  notes              text,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (resident_id, task_id)
);

-- ============================================================
-- APPLICATIONS
-- ============================================================

create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  program_id  uuid not null references public.programs(id) on delete cascade,
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  status      text not null default 'inquiry'
                check (status in ('inquiry', 'pending', 'approved', 'declined')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.application_files (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  file_type       text not null check (file_type in (
                    'transcript', 'personal_statement', 'cv',
                    'reference', 'accept_decline_letter', 'other'
                  )),
  file_name       text not null,
  storage_path    text not null,
  created_at      timestamptz not null default now()
);

create table public.inquiry_logs (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  note            text not null,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- STEERING COMMITTEE
-- ============================================================

create table public.committee_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  program_id  uuid not null references public.programs(id) on delete cascade,
  name        text not null,
  role        text,
  is_active   boolean not null default true,
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.committee_minutes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  program_id    uuid not null references public.programs(id) on delete cascade,
  meeting_date  date not null,
  title         text,
  content       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.minutes_members (
  id          uuid primary key default gen_random_uuid(),
  minutes_id  uuid not null references public.committee_minutes(id) on delete cascade,
  member_id   uuid not null references public.committee_members(id) on delete cascade,
  unique (minutes_id, member_id)
);

create table public.minutes_files (
  id            uuid primary key default gen_random_uuid(),
  minutes_id    uuid not null references public.committee_minutes(id) on delete cascade,
  file_name     text not null,
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- MODULE EVALUATIONS
-- ============================================================

create table public.module_evaluations (
  id                       uuid primary key default gen_random_uuid(),
  resident_id              uuid not null references public.residents(id) on delete cascade,
  module_id                uuid not null references public.modules(id) on delete cascade,
  resident_module_id       uuid not null references public.resident_modules(id) on delete cascade,
  faculty_id               uuid references auth.users(id) on delete set null,
  competencies_score       integer check (competencies_score between 1 and 5),
  reading_score            integer check (reading_score between 1 and 5),
  engagement_score         integer check (engagement_score between 1 and 5),
  oral_exam_score          integer check (oral_exam_score between 1 and 5),
  comments                 text,
  faculty_signed_at        timestamptz,
  resident_acknowledged_at timestamptz,
  status                   text not null default 'pending'
                             check (status in ('pending', 'approved')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.profiles (org_id);
create index on public.programs (org_id);
create index on public.modules (program_id);
create index on public.tasks (module_id);
create index on public.residents (org_id);
create index on public.residents (program_id);
create index on public.residents (user_id);
create index on public.resident_modules (resident_id);
create index on public.resident_modules (module_id);
create index on public.resident_tasks (resident_id);
create index on public.resident_tasks (task_id);
create index on public.resident_tasks (resident_module_id);
create index on public.applications (org_id);
create index on public.applications (program_id);
create index on public.application_files (application_id);
create index on public.inquiry_logs (application_id);
create index on public.committee_members (org_id);
create index on public.committee_minutes (org_id);
create index on public.minutes_members (minutes_id);
create index on public.module_evaluations (resident_id);
create index on public.module_evaluations (module_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.programs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_modules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.modules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.residents
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.resident_modules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.resident_tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.committee_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.committee_minutes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.module_evaluations
  for each row execute function public.set_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
