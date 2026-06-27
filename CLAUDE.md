# medphystrack — Claude Code Project Context

## What We Are Building

**medphystrack.com** is a SaaS LMS (Learning Management System) for medical physics
residency programs. It is niche-first, targeting CAMPEP-accredited medical physics
residency programs in the US (~200 programs).

The product allows residency program directors to manage their curriculum, track
resident progress, manage steering committee records, and handle resident applications
— all in one place.

---

## Who Uses It

| Role | Description |
|---|---|
| Super Admin | Us (the developers). Can see all organizations. |
| Program Admin | The program director or administrator at a residency program. Manages their org. |
| Resident | The medical physics resident. Can view and update their own curriculum progress. |

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (Vite) | |
| Styling | Tailwind CSS | |
| Backend / DB | Supabase | PostgreSQL + Auth + Storage + RLS |
| Hosting | Vercel or Netlify | Deploy early in Phase 3 |
| Billing | Stripe | Phase 10 |
| Email | Resend or SendGrid | Phase 11 |
| Support | Crisp or Intercom | Phase 11 |
| PDF generation | React-PDF or Puppeteer | Phase 9 |
| Repo | GitHub | |

---

## Deployment
- Hosted on Vercel, connected to GitHub repo (kmohajeri/medphystrack)
- Live at medphystrack.com (and www.medphystrack.com)
- Auto-deploys on push to main branch
- Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) set in Vercel project settings
- Supabase redirect URLs configured for localhost and production domains

---

## Going Live — Production Environment Setup

**Current state:** The Supabase project `fmwyajlsckmgjtclnypq` is the **dev/staging**
environment. It contains test data and should stay that way permanently. Do NOT
point production traffic at it.

**When ready to launch, follow these steps in order:**

### 1. Create a new Supabase project
- Name it something like `medphystrack-prod`
- Note the new project URL and anon key

### 2. Apply all migrations to the production project (in order)
Run each file in the Supabase SQL editor, 001 → 008:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_curriculum_template_fields.sql
supabase/migrations/004_mirror_fields_to_program_tables.sql
supabase/migrations/005_module_evaluation_workflow.sql
supabase/migrations/006_evaluation_files_storage.sql   ← see note below
supabase/migrations/007_programs_org_id_unique.sql
supabase/migrations/008_provision_program_rpc.sql
```

### 3. Create the Storage bucket (required before 006 RLS policies work)
In the Supabase dashboard → Storage → New bucket:
- **Name:** `evaluation-files`
- **Public:** off (private)

Do this before or immediately after running migration 006.

### 4. Seed the template curriculum
Copy the template seed SQL (template_modules + template_tasks, the 13-module
CAMPEP curriculum) from the dev project and run it in the production SQL editor.
The easiest way: Supabase dashboard → dev project → Table Editor → export rows,
or write a seed script. The data lives in `template_modules` and `template_tasks`.

### 5. Configure Supabase auth redirect URLs on the production project
In the production project → Authentication → URL Configuration:
- Site URL: `https://medphystrack.com`
- Redirect URLs: `https://medphystrack.com/reset-password`

### 6. Point Vercel to the production project
In Vercel → Project Settings → Environment Variables, update for **Production**
environment only:
```
VITE_SUPABASE_URL        = https://<prod-ref>.supabase.co
VITE_SUPABASE_ANON_KEY   = <prod anon key>
SUPABASE_SERVICE_ROLE_KEY = <prod service role key>
```
Keep the dev project keys in the **Preview** environment so feature branches
and preview deployments still hit dev, not prod.

### 7. Trigger a production deploy
Push a commit or manually redeploy in Vercel. Verify the live site hits the
production Supabase project (check network tab — the URL should show the new
project ref).

### What the production database starts with
- Empty `organizations`, `programs`, `modules`, `tasks` (no test data)
- The stock 13-module CAMPEP curriculum in `template_modules` / `template_tasks`
- First real customer's org is provisioned by Super Admin via the normal flow

## Multi-Tenancy Model
...

## Multi-Tenancy Model

- Single URL login (no subdomains) — org is determined after authentication
- Row Level Security (RLS) in Supabase enforces data isolation between orgs
- Each org's data is completely isolated from other orgs
- Super Admin can see across all orgs via a separate dashboard

---

## Curriculum Architecture (Model 3: Stock + Customizable)

- A **Template Library** (managed by Super Admin) contains the default
  Medical Physics Residency curriculum
- When a new Residency Program is created, the template is **copied** to that
  program (copy-on-provision pattern)
- The program then owns their own independent copy and can:
  - Add, remove, or rename modules
  - Reorder modules
  - Add, remove, or edit clinical and didactic tasks
  - Create fully custom modules
- The original template is never modified by program changes
- Template versioning is a future feature (notify programs when template updates)

### Curriculum Hierarchy

```
Organization
  └── Residency Program
        └── Module (ordered, e.g. "Module 1: Treatment Planning")
              ├── Clinical Tasks (hands-on competencies)
              └── Didactic Tasks (reading assignments, lectures)
```

### Task Fields

- Task name
- Task type (clinical or didactic)
- Description / instructions
- Optional: linked resource (URL or file)
- Optional: required vs elective flag

### Resident Progress

- When a curriculum is assigned to a resident, task instances are created
  (copy-on-assign pattern)
- Each resident has their own task records with status tracking
- Status options: Not Started / In Progress / Completed / Not Applicable
- Resident marks their own tasks complete
- Tasks are not quantitative (no case counts required)

---

## Curriculum Seed Data — COMPLETE (2026-06-21)

`template_modules` and `template_tasks` are fully populated with the
13-module stock CAMPEP curriculum, synthesized from four residency
handbooks (Harvard, Johns Hopkins, Spectrum Medical Physics, BayCare
Morton Plant Hospital / Lykes Radiation Pavilion).

**13 modules, 149 tasks total:**

| # | Module | Tasks | Year |
|---|---|---|---|
| 1 | Orientation & Clinical Integration | 9 | 1 |
| 2 | Ethics & Professionalism | 3 | 1 |
| 3 | Imaging for Simulation, Planning & Treatment Verification | 15 | 1 |
| 4 | Dosimetric Systems | 11 | 1 |
| 5 | Safety in Radiation Oncology | 9 | 1 |
| 6 | Treatment Planning 1 | 13 | 1 |
| 7 | Treatment Planning 2 | 12 | 1 |
| 8 | LINAC Commissioning and QA | 14 | 1 |
| 9 | TPS Modeling, Commissioning, and QA | 11 | 2 |
| 10 | Radiation Protection and Shielding | 12 | 2 |
| 11 | Brachytherapy | 17 | 2 |
| 12 | Special Procedures | 14 | 2 |
| 13 | Physicist of the Day / Research | 9 | 2 |

Each task has `task_type` of either `clinical` or `reading`. Most modules
end with a standard "concluding presentation" clinical task — Module 13 is
the exception (its research defense and final oral exam tasks serve that role).

This is the **stock/master copy only** — what gets copied into a new program's
`modules`/`tasks` tables on provisioning (Phase 4, not yet built). No actual
program has been provisioned yet; `modules` and `tasks` are currently empty.

### Known content decisions

- **HDR breast brachytherapy excluded from Module 11** — replaced clinically
  by external beam ultra-hypofractionated protocols (e.g. FAST-Forward) at the
  reference institution. This is a deliberate clinical-practice decision, not an
  oversight.
- **Textbook chapter numbers only added when confirmed** — two recurring texts:
  *Primer on Radiation Oncology Physics* (Eric Ford) and *Practical Radiation
  Oncology Physics* (Sonja Dieterich). Chapter numbers were verified against
  source material or published TOCs (e.g. Primer Ch. 18 = "Quality Assurance,"
  confirmed via Routledge). Never guessed. Some modules intentionally have no
  textbook reading task where no chapter could be confirmed (e.g. Module 10 has
  no *Practical Radiation Oncology Physics* reading).
- **ABS guidelines included in Module 11** — readings reference American
  Brachytherapy Society consensus guidelines for HDR cervical and HDR prostate
  brachytherapy, added based on actual case types at the reference institution
  (including via its Moffitt Cancer Center affiliation).

**Next step:** Phase 4 — Program Management admin UI so a Program Director can
review and customize the copied curriculum after a new program is provisioned.

---

## Core Features by Module

### 1. Program Management (Admin)
- Organization CRUD
- Residency Program CRUD
- Module CRUD with ordering
- Clinical and Didactic Task CRUD
- Curriculum preview

### 2. Resident Management (Admin)
- Resident CRUD
- Assign curriculum to resident
- Application management (Pending / Approved / Declined / Inquiry)
- File uploads: transcripts, personal statement, CV, references, accept/decline letter
- Inquiry log

### 3. Steering Committee (Admin)
- Committee member CRUD (name, role, active/inactive, start/end dates)
- Meeting minutes CRUD
- Attach members to meetings
- File attachments

### 4. Module Evaluation (Admin + Resident)
- Faculty creates evaluation per resident per module
- Evaluation fields: competencies, reading, engagement, oral exam, comments
- Faculty signoff workflow
- Resident acknowledgment and signoff
- Status: Pending / Approved

### 5. Resident Portal
- Dashboard with overall progress summary
- Curriculum view (modules → tasks)
- Mark clinical and didactic tasks complete
- Upload documentation per task
- Add comments per task
- Progress charts per module
- Handbook access (PDF viewer)

### 6. Handbook
- Static PDF upload (Phase 6)
- Dynamic editable handbook with PDF export (Phase 9)

---

## Build Phases & Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Foundation & Database Schema | ✅ Complete |
| Phase 2 | Authentication & User Roles | ✅ Complete |
| Phase 3 | Frontend Scaffold | ✅ Complete |
| Phase 4 | Program Management (Admin) | ✅ Complete |
| Phase 5 | Resident Management (Admin) | 🔲 Not started |
| Phase 6 | Resident Portal | 🔲 Not started |
| Phase 7 | Steering Committee (Admin) | 🔲 Not started |
| Phase 8 | Module Evaluation | 🔲 Not started |
| Phase 9 | Handbook (Dynamic PDF) | 🔲 Not started |
| Phase 10 | Billing & Multi-Tenancy | 🔲 Not started |
| Phase 11 | Support & Notifications | 🔲 Not started |
| Phase 12 | Polish & Launch Prep | 🔲 Not started |

---

## Phase QA Notes

### Phase 4 — Program Management (Admin) — tested 2026-06-27

**Method:** Playwright (Chromium, headed) against live Vite dev server (`npm run dev`) and the dev Supabase project. Two accounts used: `kayhan.mohajeri@gmail.com` (super_admin) and `kmohajeri@outlook.com` (program_admin).

**How to re-run:** The test script lives at `phase4_test.mjs` in the project root (gitignored). Run with `node phase4_test.mjs` from the project root after starting the dev server. Requires `playwright` as a dev dependency (`npm install --save-dev playwright && npx playwright install chromium`).

**What was tested:**

| Area | Steps |
|---|---|
| Super Admin → Organizations | Create org; rename org (Edit modal); archive org (type-to-confirm modal) |
| Super Admin → Programs | Create program for a specific org (provisions 13 modules + 149 tasks via `provision_program` RPC); rename; archive |
| Program Admin → Curriculum | Year section headers (Year 1 / Year 2 / Unassigned); module cards render; expand module to see tasks; Clinical + Reading type badges; Add module; Edit module; Reorder module (move up); Add task; Edit task; Delete task; Delete module |
| RLS probe | program_admin navigating to `/super-admin/organizations` is redirected away — no data exposed |
| Hard nav | `/program-admin/curriculum` loads correctly on full page reload |

**Result:** PASS — 24/24 steps

**Bugs found and fixed during testing:**
- `LoginPage` was calling `navigate()` during render (lines 15–18), producing a React `setState during render` warning. Fixed by moving the redirect into a `useEffect`.

**Known limitations / things not tested:**
- Archive does not delete data — archived orgs/programs are hidden from active lists but data is preserved. No UI yet to view or restore archived records.
- `provision_program` RPC takes ~15–20 seconds (copies 149 tasks). No loading indicator beyond button going disabled — acceptable for now, worth a spinner in a later polish phase.
- The `ArchiveOrganizationModal` uses a type-to-confirm pattern (user must type the org name exactly). Same pattern not used for programs — the program archive modal uses a simple red button confirm. Inconsistency is intentional for now (orgs are higher stakes than programs).

---

## Key Product Decisions (Already Made)

- **No subdomains** — single URL, org determined post-login
- **Resident marks their own tasks** — no supervisor sign-off on individual tasks
- **Clinical tasks are not quantitative** — no case counts, just status
- **Curriculum is copied on assignment** — residents own their task instances
- **Template library** — default CAMPEP curriculum ships with the product
- **Handbook starts as static PDF** — dynamic version is Phase 9
- **Target market** — CAMPEP-accredited medical physics residency programs (~200 in US)
- **Pricing target** — ~$199/month per program
- **Buyer persona** — Program Director (not hospital IT or administrator)
- **Onboarding model (Option A)** — Super Admin creates the Organization and 
  Residency Program first (curriculum template copies automatically), then 
  creates the Program Admin account linked via org_id. Program Admin's first 
  login lands in an already-configured workspace, not a blank slate.

---

## Existing Knack App (Reference Only)

The founder built a working prototype in Knack. Key objects for reference:

| Knack Object | Maps To |
|---|---|
| Organization (object_5) | organizations table |
| Residency Program (object_6) | programs table |
| Module (object_10) | modules table |
| Task (object_12) | tasks table (clinical) |
| Didactic (object_17) | tasks table (didactic, task_type = 'didactic') |
| Residents (object_7) | residents table |
| Resident Module (object_13) | resident_modules table |
| Resident Task (object_14) | resident_tasks table |
| Resident Didactic (object_21) | resident_tasks table (task_type = 'didactic') |
| Resident Task Progress (object_22) | merged into resident_tasks |
| Application (object_9) | applications table |
| Steering Committee Members (object_18) | committee_members table |
| Steering Committee Minutes (object_24) | committee_minutes table |
| Resident Module Evaluation (object_25) | module_evaluations table |

### Known Issues in Knack Prototype (Fixed in Rebuild)
- object_22 (Resident Task Progress) had no status field — status lived on object_14
- object_14 and object_22 had a circular reference — consolidated in rebuild
- object_3 (Resident User ID) had no outbound connections — residents couldn't query their data
- object_7 (Residents) had orphaned flat text fields used as a workaround — removed in rebuild

---

## Environment Variables Needed

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

---

## Notes for Claude Code Sessions

- Always check this file at the start of each session
- Update the Phase Status table when a phase is completed
- Update the Database Schema section after Phase 1 is complete
- Do not use the Knack object names in new code — use the mapped table names above
- RLS policies are critical — every table must have them before moving on
- Test with 2 residents and 1 program minimum before marking any phase complete

---

## Database Schema

Migration files: `supabase/migrations/`
- `001_initial_schema.sql` — 18 tables with indexes and triggers
- `002_rls_policies.sql` — RLS enabled with role-based policies
- `003_curriculum_template_fields.sql` — adds duration_weeks, year to template_modules; cases_required to template_tasks; tightens task_type CHECK to ('clinical', 'reading')
- `004_mirror_fields_to_program_tables.sql` — mirrors duration_weeks, year onto modules; cases_required onto tasks; tightens task_type CHECK on tasks to ('clinical', 'reading')
- `005_module_evaluation_workflow.sql` — (1) adds status/archived_at columns to organizations and programs with a set_archived_at() trigger; (2) revamps module_evaluations columns (booleans, oral_exam_score text, renamed comments, new engaged_with_mentors_staff and resident_comments fields); (3) adds evaluation_files table + RLS; (4) adds started_at/completed_at to resident_modules
- `006_evaluation_files_storage.sql` — RLS policies on storage.objects for the evaluation-files bucket (bucket must be created manually in Supabase dashboard first — private, name: evaluation-files)
- `007_programs_org_id_unique.sql` — adds UNIQUE constraint on programs.org_id (1:1 org-to-program invariant)

Status: Live in Supabase project fmwyajlsckmgjtclnypq

| Table | Purpose |
|---|---|
| `organizations` | Top-level tenant |
| `profiles` | Extends `auth.users` — role + org assignment |
| `programs` | Residency programs within an org |
| `template_modules` | Super-admin-managed default curriculum modules |
| `template_tasks` | Tasks inside template modules (clinical or reading) |
| `modules` | Program-owned copy of template modules |
| `tasks` | Program-owned copy of template tasks |
| `residents` | Resident records, linked to `auth.users` via `user_id` |
| `resident_modules` | Per-resident module instance (status tracking) |
| `resident_tasks` | Per-resident task instance — copy-on-assign |
| `applications` | Applicant records with status workflow |
| `application_files` | File uploads per application |
| `inquiry_logs` | Log of notes per application |
| `committee_members` | Steering committee members |
| `committee_minutes` | Meeting minutes |
| `minutes_members` | Join table: members ↔ meetings |
| `minutes_files` | File attachments on meeting minutes |
| `module_evaluations` | Faculty evaluation per resident per module (oral exam + sign-off workflow) |
| `evaluation_files` | File uploads per evaluation (presentation + supplementary docs) |

### template_modules / modules — extra columns (beyond id / name / description / order_index / timestamps)
| Column | Type | Notes |
|---|---|---|
| `duration_weeks` | integer, nullable | Approx rotation length in weeks |
| `year` | integer, nullable | Training year (1 or 2); orientation counts as year 1 |

Both `template_modules` and `modules` carry these columns. On provisioning, `modules` values are copied from the template; editable per-program thereafter.

### template_tasks / tasks — extra columns (beyond id / module_id / name / description / resource_url / is_required / order_index / timestamps)
| Column | Type | Notes |
|---|---|---|
| `task_type` | text, not null | `'clinical'` or `'reading'` — CHECK constraint on both tables |
| `cases_required` | integer, nullable | Case count for clinical tasks; null for reading tasks |

Both `template_tasks` and `tasks` carry these columns and the same `task_type` CHECK. On provisioning, `tasks` values are copied from the template; editable per-program thereafter.

### Module Evaluation Workflow (migrations 005–007, added 2026-06-21)

The module-concluding presentation/oral exam workflow (resident presents, faculty
conducts oral exam, both parties electronically sign off) is supported by schema
changes to `module_evaluations`, `resident_modules`, and a new `evaluation_files`
table + Storage bucket.

#### `module_evaluations` — changed columns

| Column | Old type | New type | Notes |
|---|---|---|---|
| `competencies_score` | integer (1-5 CHECK) | boolean | Yes/No: were all module competencies completed? |
| `reading_score` | integer (1-5 CHECK) | boolean | Yes/No: were all reading assignments completed? |
| `engagement_score` | integer (1-5 CHECK) | *(dropped)* | Replaced by `engaged_with_mentors_staff` |
| `oral_exam_score` | integer (1-5 CHECK) | text (CHECK) | `'pass'` \| `'conditional_pass'` \| `'fail'` |
| `comments` | text | *(renamed)* | Renamed to `faculty_comments` |

#### `module_evaluations` — new columns

| Column | Type | Notes |
|---|---|---|
| `engaged_with_mentors_staff` | boolean | Combined engagement + mentor-interaction question |
| `resident_comments` | text | Resident's own comments, separate from `faculty_comments` |

Unchanged: `id`, `resident_id` (→ `residents.id`), `module_id`, `resident_module_id`,
`faculty_id` (→ `auth.users.id`), `faculty_signed_at`, `resident_acknowledged_at`,
`status` (CHECK: `'pending'` | `'approved'`), `created_at`, `updated_at`.

#### `resident_modules` — new columns

| Column | Type | Notes |
|---|---|---|
| `started_at` | timestamptz, nullable | |
| `completed_at` | timestamptz, nullable | |

#### New table: `evaluation_files`

Mirrors the `application_files` pattern. Supports multiple files per evaluation
(required presentation + optional supplementary docs), uploaded by the resident.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `evaluation_id` | uuid FK | → `module_evaluations.id`, ON DELETE CASCADE |
| `file_type` | text (CHECK) | `'presentation'` \| `'supplementary'` |
| `file_name` | text | |
| `storage_path` | text | Path into the `evaluation-files` Storage bucket |
| `uploaded_by` | uuid FK | → `profiles.id` (the logged-in resident) |
| `created_at` | timestamptz | |

#### New Storage bucket: `evaluation-files`

Private bucket. Path convention: `{program_id}/{resident_id}/{evaluation_id}/{filename}`
(`resident_id` = `residents.id`, **not** `auth.uid()`; RLS resolves the requesting user
via `residents.user_id`).

Access model (Storage RLS on `storage.objects`):
- **Resident**: full CRUD on their own files, but only while `module_evaluations.faculty_signed_at IS NULL` (locked after faculty sign-off).
- **Program Admin**: SELECT + DELETE on files belonging to their program (via `profiles.org_id → programs.org_id`). No upload access.
- **Super Admin**: full access.

#### Schema invariant: one program per organization

`programs.org_id` has a `UNIQUE` constraint (`programs_org_id_unique`). This is a
confirmed product decision. Several RLS policies (including Storage policies above)
depend on this constraint for program-scoping logic to be safe. Do not relax it
without revisiting those policies.

Migration application order note: 006 was applied before 005 in practice (no
functional issue — 006 only references pre-existing tables), but the intended
order is 005 → 007 → 006.

**Helper functions:** `get_my_role()`, `get_my_org_id()` (used in RLS policies)
**Trigger:** `handle_new_user()` auto-creates a profile row on signup
**Trigger:** `set_updated_at()` keeps `updated_at` current on all tables

Tables: organizations, programs, modules, tasks, residents,
resident_modules, resident_tasks, applications, application_files,
inquiry_logs, committee_members, committee_minutes, minutes_files,
minutes_members, module_evaluations, evaluation_files, profiles,
template_modules, template_tasks
---

## File Structure

```
src/
  context/
    AuthContext.jsx               # AuthProvider, useAuth hook, roleHomePath helper
  components/
    layout/
      AppLayout.jsx               # Shell: fixed sidebar + sticky topbar + main content
      Sidebar.jsx                 # Role-based nav (dark slate), responsive drawer on mobile
      TopBar.jsx                  # Sticky header: hamburger (mobile), user name, sign out
    ProtectedRoute.jsx            # Blocks access if session missing or role doesn't match
  pages/
    LoginPage.jsx                 # Email + password login
    ForgotPasswordPage.jsx        # Send password reset email
    ResetPasswordPage.jsx         # Set new password via email link (PASSWORD_RECOVERY flow)
    dashboards/
      SuperAdminDashboard.jsx     # Uses AppLayout
      ProgramAdminDashboard.jsx   # Uses AppLayout
      ResidentDashboard.jsx       # Uses AppLayout
  lib/
    supabase.js                   # Supabase client singleton
  App.jsx                         # BrowserRouter + AuthProvider + Routes
  main.jsx                        # React root mount
  index.css                       # Tailwind v4 import
public/
  _redirects                      # Netlify SPA fallback
vercel.json                       # Vercel SPA fallback
```

### Sidebar nav items per role
- **super_admin**: Dashboard, Organizations, Programs, Template Library, Users
- **program_admin**: Dashboard, Curriculum, Residents, Applications, Steering Committee, Evaluations
- **resident**: Dashboard, My Curriculum, Evaluations, Handbook

### Layout behavior
- Sidebar is always `fixed` left; main content has `lg:pl-64` offset on desktop
- On mobile: sidebar is off-screen (`-translate-x-full`), hamburger slides it in as a drawer with dark overlay
- On desktop (lg+): sidebar always visible via `lg:translate-x-0`

### Auth flow notes
- Login → `signInWithPassword` → navigate `/` → `RootRedirect` checks profile.role → sends to correct portal
- Password reset: `resetPasswordForEmail` with `redirectTo: /reset-password` → Supabase fires
  `PASSWORD_RECOVERY` in `onAuthStateChange` → form shown → `updateUser({ password })` → redirect to `/`
- `ProtectedRoute` checks `session` (→ /login) then `profile.role === allowedRole` (→ their correct portal)
- No self-serve signup — all accounts created by admins (invite flow is a later phase)

### Supabase dashboard requirements (one-time setup)
- Authentication → URL Configuration → Site URL: your domain (or http://localhost:5173 for dev)
- Authentication → URL Configuration → Redirect URLs: add `http://localhost:5173/reset-password`
  (and your production URL when deploying)
