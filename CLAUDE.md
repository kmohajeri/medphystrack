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
| Phase 4 | Program Management (Admin) | 🔲 Not started |
| Phase 5 | Resident Management (Admin) | 🔲 Not started |
| Phase 6 | Resident Portal | 🔲 Not started |
| Phase 7 | Steering Committee (Admin) | 🔲 Not started |
| Phase 8 | Module Evaluation | 🔲 Not started |
| Phase 9 | Handbook (Dynamic PDF) | 🔲 Not started |
| Phase 10 | Billing & Multi-Tenancy | 🔲 Not started |
| Phase 11 | Support & Notifications | 🔲 Not started |
| Phase 12 | Polish & Launch Prep | 🔲 Not started |

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

Migration files: `supabase/migrations/001_initial_schema.sql` and `002_rls_policies.sql`

| Table | Purpose |
|---|---|
| `organizations` | Top-level tenant |
| `profiles` | Extends `auth.users` — role + org assignment |
| `programs` | Residency programs within an org |
| `template_modules` | Super-admin-managed default curriculum modules |
| `template_tasks` | Tasks inside template modules (clinical or didactic) |
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
| `module_evaluations` | Faculty evaluation per resident per module |

**Helper functions:** `get_my_role()`, `get_my_org_id()` (used in RLS policies)
**Trigger:** `handle_new_user()` auto-creates a profile row on signup
**Trigger:** `set_updated_at()` keeps `updated_at` current on all tables

Schema created via Supabase migrations:
- 001_initial_schema.sql — 18 tables with indexes and triggers
- 002_rls_policies.sql — RLS enabled with role-based policies
Status: Live in Supabase project fmwyajlsckmgjtclnypq

Tables: organizations, programs, modules, tasks, residents,
resident_modules, resident_tasks, applications, application_files,
inquiry_logs, committee_members, committee_minutes, minutes_files,
minutes_members, module_evaluations, profiles, template_modules,
template_tasks
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
