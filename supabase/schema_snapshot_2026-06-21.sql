


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_my_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select org_id from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_program"("p_org_id" "uuid", "p_program_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."provision_program"("p_org_id" "uuid", "p_program_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."provision_program"("p_org_id" "uuid", "p_program_name" "text") IS 'Atomically creates a program for an org and copies the stock template_modules/template_tasks curriculum into modules/tasks (copy-on-provision). Super admin only.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."application_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "application_files_file_type_check" CHECK (("file_type" = ANY (ARRAY['transcript'::"text", 'personal_statement'::"text", 'cv'::"text", 'reference'::"text", 'accept_decline_letter'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."application_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'inquiry'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['inquiry'::"text", 'pending'::"text", 'approved'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."committee_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."committee_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."committee_minutes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "meeting_date" "date" NOT NULL,
    "title" "text",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."committee_minutes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evaluation_id" "uuid" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evaluation_files_file_type_check" CHECK (("file_type" = ANY (ARRAY['presentation'::"text", 'supplementary'::"text"])))
);


ALTER TABLE "public"."evaluation_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."evaluation_files" IS 'Files uploaded as part of a module evaluation (presentation slides plus optional supplementary documents). Mirrors the application_files pattern.';



COMMENT ON COLUMN "public"."evaluation_files"."evaluation_id" IS 'The module_evaluations row this file belongs to.';



COMMENT ON COLUMN "public"."evaluation_files"."file_type" IS 'presentation = the required module-concluding presentation; supplementary = any additional supporting document.';



COMMENT ON COLUMN "public"."evaluation_files"."uploaded_by" IS 'The resident (profiles.id) who uploaded this file.';



CREATE TABLE IF NOT EXISTS "public"."inquiry_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inquiry_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."minutes_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "minutes_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."minutes_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."minutes_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "minutes_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL
);


ALTER TABLE "public"."minutes_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resident_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "resident_module_id" "uuid" NOT NULL,
    "faculty_id" "uuid",
    "competencies_score" boolean,
    "reading_score" boolean,
    "oral_exam_score" "text",
    "faculty_comments" "text",
    "faculty_signed_at" timestamp with time zone,
    "resident_acknowledged_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "engaged_with_mentors_staff" boolean,
    "resident_comments" "text",
    CONSTRAINT "module_evaluations_oral_exam_score_check" CHECK (("oral_exam_score" = ANY (ARRAY['pass'::"text", 'conditional_pass'::"text", 'fail'::"text"]))),
    CONSTRAINT "module_evaluations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text"])))
);


ALTER TABLE "public"."module_evaluations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."module_evaluations"."competencies_score" IS 'Were all module competencies completed? Yes/No.';



COMMENT ON COLUMN "public"."module_evaluations"."reading_score" IS 'Were all reading assignments completed? Yes/No.';



COMMENT ON COLUMN "public"."module_evaluations"."oral_exam_score" IS 'Outcome of the module-concluding oral exam: pass, conditional_pass, or fail.';



COMMENT ON COLUMN "public"."module_evaluations"."faculty_comments" IS 'Faculty/evaluator narrative comments on the module presentation and oral exam.';



COMMENT ON COLUMN "public"."module_evaluations"."engaged_with_mentors_staff" IS 'Was the resident sufficiently engaged and did they interact appropriately with mentors and staff during the module? Yes/No.';



COMMENT ON COLUMN "public"."module_evaluations"."resident_comments" IS 'Optional resident comments, recorded alongside their acknowledgment sign-off.';



CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "template_module_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_weeks" integer,
    "year" integer
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."modules"."duration_weeks" IS 'Approximate module duration in weeks. Copied from template_modules.duration_weeks on provisioning; editable per-program thereafter.';



COMMENT ON COLUMN "public"."modules"."year" IS 'Training year (1 or 2) the module belongs to. Copied from template_modules.year on provisioning; editable per-program thereafter.';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid",
    "role" "text",
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'program_admin'::"text", 'resident'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resident_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resident_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "resident_modules_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."resident_modules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."resident_modules"."started_at" IS 'Date/time the resident began this module.';



COMMENT ON COLUMN "public"."resident_modules"."completed_at" IS 'Date/time the resident completed this module (all tasks done, evaluation signed off).';



CREATE TABLE IF NOT EXISTS "public"."resident_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resident_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "resident_module_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "notes" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resident_tasks_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text", 'not_applicable'::"text"])))
);


ALTER TABLE "public"."resident_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."residents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "residents_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'graduated'::"text"])))
);


ALTER TABLE "public"."residents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "template_task_id" "uuid",
    "name" "text" NOT NULL,
    "task_type" "text" NOT NULL,
    "description" "text",
    "resource_url" "text",
    "is_required" boolean DEFAULT true NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cases_required" integer,
    CONSTRAINT "tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['clinical'::"text", 'reading'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."cases_required" IS 'Number of clinical cases required to complete this task. Copied from template_tasks.cases_required on provisioning; editable per-program thereafter.';



CREATE TABLE IF NOT EXISTS "public"."template_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_weeks" integer,
    "year" integer
);


ALTER TABLE "public"."template_modules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."template_modules"."duration_weeks" IS 'Approximate module duration in weeks (e.g. 2-month rotation = 8 weeks). Nullable for modules without a fixed duration.';



COMMENT ON COLUMN "public"."template_modules"."year" IS 'Training year the module belongs to (1 or 2). Orientation is counted as year 1.';



CREATE TABLE IF NOT EXISTS "public"."template_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "task_type" "text" NOT NULL,
    "description" "text",
    "resource_url" "text",
    "is_required" boolean DEFAULT true NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cases_required" integer,
    CONSTRAINT "template_tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['clinical'::"text", 'reading'::"text"])))
);


ALTER TABLE "public"."template_tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."template_tasks"."cases_required" IS 'Number of clinical cases required to complete this task (e.g. 2 for "two or more HDR breast cases"). Null for reading tasks or clinical tasks without a case count.';



ALTER TABLE ONLY "public"."application_files"
    ADD CONSTRAINT "application_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."committee_members"
    ADD CONSTRAINT "committee_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."committee_minutes"
    ADD CONSTRAINT "committee_minutes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_files"
    ADD CONSTRAINT "evaluation_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inquiry_logs"
    ADD CONSTRAINT "inquiry_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."minutes_files"
    ADD CONSTRAINT "minutes_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."minutes_members"
    ADD CONSTRAINT "minutes_members_minutes_id_member_id_key" UNIQUE ("minutes_id", "member_id");



ALTER TABLE ONLY "public"."minutes_members"
    ADD CONSTRAINT "minutes_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_evaluations"
    ADD CONSTRAINT "module_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_org_id_unique" UNIQUE ("org_id");



COMMENT ON CONSTRAINT "programs_org_id_unique" ON "public"."programs" IS 'Enforces one program per organization. Required for org_id-based program-scoping joins (e.g. Storage RLS policies) to be safe.';



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resident_modules"
    ADD CONSTRAINT "resident_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resident_modules"
    ADD CONSTRAINT "resident_modules_resident_id_module_id_key" UNIQUE ("resident_id", "module_id");



ALTER TABLE ONLY "public"."resident_tasks"
    ADD CONSTRAINT "resident_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resident_tasks"
    ADD CONSTRAINT "resident_tasks_resident_id_task_id_key" UNIQUE ("resident_id", "task_id");



ALTER TABLE ONLY "public"."residents"
    ADD CONSTRAINT "residents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_modules"
    ADD CONSTRAINT "template_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "application_files_application_id_idx" ON "public"."application_files" USING "btree" ("application_id");



CREATE INDEX "applications_org_id_idx" ON "public"."applications" USING "btree" ("org_id");



CREATE INDEX "applications_program_id_idx" ON "public"."applications" USING "btree" ("program_id");



CREATE INDEX "committee_members_org_id_idx" ON "public"."committee_members" USING "btree" ("org_id");



CREATE INDEX "committee_minutes_org_id_idx" ON "public"."committee_minutes" USING "btree" ("org_id");



CREATE INDEX "inquiry_logs_application_id_idx" ON "public"."inquiry_logs" USING "btree" ("application_id");



CREATE INDEX "minutes_members_minutes_id_idx" ON "public"."minutes_members" USING "btree" ("minutes_id");



CREATE INDEX "module_evaluations_module_id_idx" ON "public"."module_evaluations" USING "btree" ("module_id");



CREATE INDEX "module_evaluations_resident_id_idx" ON "public"."module_evaluations" USING "btree" ("resident_id");



CREATE INDEX "modules_program_id_idx" ON "public"."modules" USING "btree" ("program_id");



CREATE INDEX "profiles_org_id_idx" ON "public"."profiles" USING "btree" ("org_id");



CREATE INDEX "programs_org_id_idx" ON "public"."programs" USING "btree" ("org_id");



CREATE INDEX "resident_modules_module_id_idx" ON "public"."resident_modules" USING "btree" ("module_id");



CREATE INDEX "resident_modules_resident_id_idx" ON "public"."resident_modules" USING "btree" ("resident_id");



CREATE INDEX "resident_tasks_resident_id_idx" ON "public"."resident_tasks" USING "btree" ("resident_id");



CREATE INDEX "resident_tasks_resident_module_id_idx" ON "public"."resident_tasks" USING "btree" ("resident_module_id");



CREATE INDEX "resident_tasks_task_id_idx" ON "public"."resident_tasks" USING "btree" ("task_id");



CREATE INDEX "residents_org_id_idx" ON "public"."residents" USING "btree" ("org_id");



CREATE INDEX "residents_program_id_idx" ON "public"."residents" USING "btree" ("program_id");



CREATE INDEX "residents_user_id_idx" ON "public"."residents" USING "btree" ("user_id");



CREATE INDEX "tasks_module_id_idx" ON "public"."tasks" USING "btree" ("module_id");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."committee_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."committee_minutes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."module_evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."resident_modules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."resident_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."residents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."template_modules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."template_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."application_files"
    ADD CONSTRAINT "application_files_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."committee_members"
    ADD CONSTRAINT "committee_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."committee_members"
    ADD CONSTRAINT "committee_members_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."committee_minutes"
    ADD CONSTRAINT "committee_minutes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."committee_minutes"
    ADD CONSTRAINT "committee_minutes_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_files"
    ADD CONSTRAINT "evaluation_files_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."module_evaluations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_files"
    ADD CONSTRAINT "evaluation_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."inquiry_logs"
    ADD CONSTRAINT "inquiry_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inquiry_logs"
    ADD CONSTRAINT "inquiry_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."minutes_files"
    ADD CONSTRAINT "minutes_files_minutes_id_fkey" FOREIGN KEY ("minutes_id") REFERENCES "public"."committee_minutes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."minutes_members"
    ADD CONSTRAINT "minutes_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."committee_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."minutes_members"
    ADD CONSTRAINT "minutes_members_minutes_id_fkey" FOREIGN KEY ("minutes_id") REFERENCES "public"."committee_minutes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_evaluations"
    ADD CONSTRAINT "module_evaluations_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."module_evaluations"
    ADD CONSTRAINT "module_evaluations_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_evaluations"
    ADD CONSTRAINT "module_evaluations_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_evaluations"
    ADD CONSTRAINT "module_evaluations_resident_module_id_fkey" FOREIGN KEY ("resident_module_id") REFERENCES "public"."resident_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_template_module_id_fkey" FOREIGN KEY ("template_module_id") REFERENCES "public"."template_modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resident_modules"
    ADD CONSTRAINT "resident_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resident_modules"
    ADD CONSTRAINT "resident_modules_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resident_tasks"
    ADD CONSTRAINT "resident_tasks_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resident_tasks"
    ADD CONSTRAINT "resident_tasks_resident_module_id_fkey" FOREIGN KEY ("resident_module_id") REFERENCES "public"."resident_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resident_tasks"
    ADD CONSTRAINT "resident_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."residents"
    ADD CONSTRAINT "residents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."residents"
    ADD CONSTRAINT "residents_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."residents"
    ADD CONSTRAINT "residents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_template_task_id_fkey" FOREIGN KEY ("template_task_id") REFERENCES "public"."template_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."template_modules"("id") ON DELETE CASCADE;



ALTER TABLE "public"."application_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."committee_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."committee_minutes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inquiry_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."minutes_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."minutes_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_admin: full access to own org application_files" ON "public"."application_files" USING (("application_id" IN ( SELECT "applications"."id"
   FROM "public"."applications"
  WHERE ("applications"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org applications" ON "public"."applications" USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "program_admin: full access to own org committee_members" ON "public"."committee_members" USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "program_admin: full access to own org committee_minutes" ON "public"."committee_minutes" USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "program_admin: full access to own org inquiry_logs" ON "public"."inquiry_logs" USING (("application_id" IN ( SELECT "applications"."id"
   FROM "public"."applications"
  WHERE ("applications"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org minutes_files" ON "public"."minutes_files" USING (("minutes_id" IN ( SELECT "committee_minutes"."id"
   FROM "public"."committee_minutes"
  WHERE ("committee_minutes"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org minutes_members" ON "public"."minutes_members" USING (("minutes_id" IN ( SELECT "committee_minutes"."id"
   FROM "public"."committee_minutes"
  WHERE ("committee_minutes"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org module_evaluations" ON "public"."module_evaluations" USING (("resident_id" IN ( SELECT "residents"."id"
   FROM "public"."residents"
  WHERE ("residents"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org modules" ON "public"."modules" USING (("program_id" IN ( SELECT "programs"."id"
   FROM "public"."programs"
  WHERE ("programs"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org programs" ON "public"."programs" USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "program_admin: full access to own org resident_modules" ON "public"."resident_modules" USING (("resident_id" IN ( SELECT "residents"."id"
   FROM "public"."residents"
  WHERE ("residents"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org resident_tasks" ON "public"."resident_tasks" USING (("resident_id" IN ( SELECT "residents"."id"
   FROM "public"."residents"
  WHERE ("residents"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: full access to own org residents" ON "public"."residents" USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "program_admin: full access to own org tasks" ON "public"."tasks" USING (("module_id" IN ( SELECT "m"."id"
   FROM ("public"."modules" "m"
     JOIN "public"."programs" "p" ON (("p"."id" = "m"."program_id")))
  WHERE ("p"."org_id" = "public"."get_my_org_id"()))));



CREATE POLICY "program_admin: read template_modules" ON "public"."template_modules" FOR SELECT USING (("public"."get_my_role"() = 'program_admin'::"text"));



CREATE POLICY "program_admin: read template_tasks" ON "public"."template_tasks" FOR SELECT USING (("public"."get_my_role"() = 'program_admin'::"text"));



CREATE POLICY "program_admin: view own org" ON "public"."organizations" FOR SELECT USING (("id" = "public"."get_my_org_id"()));



CREATE POLICY "program_admin: view profiles in own org" ON "public"."profiles" FOR SELECT USING (("org_id" = "public"."get_my_org_id"()));



ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "resident: read modules in own program" ON "public"."modules" FOR SELECT USING (("program_id" IN ( SELECT "residents"."program_id"
   FROM "public"."residents"
  WHERE ("residents"."user_id" = "auth"."uid"()))));



CREATE POLICY "resident: read tasks in own program" ON "public"."tasks" FOR SELECT USING (("module_id" IN ( SELECT "m"."id"
   FROM ("public"."modules" "m"
     JOIN "public"."residents" "r" ON (("r"."program_id" = "m"."program_id")))
  WHERE ("r"."user_id" = "auth"."uid"()))));



CREATE POLICY "resident: read template_modules" ON "public"."template_modules" FOR SELECT USING (("public"."get_my_role"() = 'resident'::"text"));



CREATE POLICY "resident: read template_tasks" ON "public"."template_tasks" FOR SELECT USING (("public"."get_my_role"() = 'resident'::"text"));



CREATE POLICY "resident: view and update own resident_tasks" ON "public"."resident_tasks" USING (("resident_id" IN ( SELECT "residents"."id"
   FROM "public"."residents"
  WHERE ("residents"."user_id" = "auth"."uid"()))));



CREATE POLICY "resident: view own evaluations and acknowledge" ON "public"."module_evaluations" USING (("resident_id" IN ( SELECT "residents"."id"
   FROM "public"."residents"
  WHERE ("residents"."user_id" = "auth"."uid"()))));



CREATE POLICY "resident: view own org" ON "public"."organizations" FOR SELECT USING (("id" = "public"."get_my_org_id"()));



CREATE POLICY "resident: view own org programs" ON "public"."programs" FOR SELECT USING (("org_id" = "public"."get_my_org_id"()));



CREATE POLICY "resident: view own resident record" ON "public"."residents" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "resident: view own resident_modules" ON "public"."resident_modules" FOR SELECT USING (("resident_id" IN ( SELECT "residents"."id"
   FROM "public"."residents"
  WHERE ("residents"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."resident_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resident_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."residents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super_admin: full access to application_files" ON "public"."application_files" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to applications" ON "public"."applications" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to committee_members" ON "public"."committee_members" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to committee_minutes" ON "public"."committee_minutes" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to inquiry_logs" ON "public"."inquiry_logs" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to minutes_files" ON "public"."minutes_files" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to minutes_members" ON "public"."minutes_members" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to module_evaluations" ON "public"."module_evaluations" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to modules" ON "public"."modules" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to organizations" ON "public"."organizations" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to profiles" ON "public"."profiles" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to programs" ON "public"."programs" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to resident_modules" ON "public"."resident_modules" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to resident_tasks" ON "public"."resident_tasks" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to residents" ON "public"."residents" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to tasks" ON "public"."tasks" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to template_modules" ON "public"."template_modules" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "super_admin: full access to template_tasks" ON "public"."template_tasks" USING (("public"."get_my_role"() = 'super_admin'::"text"));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users: view and update own profile" ON "public"."profiles" USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."provision_program"("p_org_id" "uuid", "p_program_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_program"("p_org_id" "uuid", "p_program_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_program"("p_org_id" "uuid", "p_program_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."application_files" TO "anon";
GRANT ALL ON TABLE "public"."application_files" TO "authenticated";
GRANT ALL ON TABLE "public"."application_files" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."committee_members" TO "anon";
GRANT ALL ON TABLE "public"."committee_members" TO "authenticated";
GRANT ALL ON TABLE "public"."committee_members" TO "service_role";



GRANT ALL ON TABLE "public"."committee_minutes" TO "anon";
GRANT ALL ON TABLE "public"."committee_minutes" TO "authenticated";
GRANT ALL ON TABLE "public"."committee_minutes" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_files" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_files" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_files" TO "service_role";



GRANT ALL ON TABLE "public"."inquiry_logs" TO "anon";
GRANT ALL ON TABLE "public"."inquiry_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiry_logs" TO "service_role";



GRANT ALL ON TABLE "public"."minutes_files" TO "anon";
GRANT ALL ON TABLE "public"."minutes_files" TO "authenticated";
GRANT ALL ON TABLE "public"."minutes_files" TO "service_role";



GRANT ALL ON TABLE "public"."minutes_members" TO "anon";
GRANT ALL ON TABLE "public"."minutes_members" TO "authenticated";
GRANT ALL ON TABLE "public"."minutes_members" TO "service_role";



GRANT ALL ON TABLE "public"."module_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."module_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."module_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."resident_modules" TO "anon";
GRANT ALL ON TABLE "public"."resident_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."resident_modules" TO "service_role";



GRANT ALL ON TABLE "public"."resident_tasks" TO "anon";
GRANT ALL ON TABLE "public"."resident_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."resident_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."residents" TO "anon";
GRANT ALL ON TABLE "public"."residents" TO "authenticated";
GRANT ALL ON TABLE "public"."residents" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."template_modules" TO "anon";
GRANT ALL ON TABLE "public"."template_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."template_modules" TO "service_role";



GRANT ALL ON TABLE "public"."template_tasks" TO "anon";
GRANT ALL ON TABLE "public"."template_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."template_tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































