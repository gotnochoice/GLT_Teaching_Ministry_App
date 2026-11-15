import { Pool } from "pg";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY, name text NOT NULL, email text UNIQUE, phone text,
  password_hash text, role text NOT NULL DEFAULT 'STUDENT',
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS courses (
  id text PRIMARY KEY, number integer NOT NULL UNIQUE, title text NOT NULL, description text
);
CREATE TABLE IF NOT EXISTS cohorts (
  id text PRIMARY KEY, name text NOT NULL, mode text NOT NULL DEFAULT 'in-person',
  start_date text, teacher_id text REFERENCES users(id), status text NOT NULL DEFAULT 'active',
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY, user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  cohort_id text REFERENCES cohorts(id), current_class integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active', enrolled_at text, graduated_at text, notes text
);
CREATE TABLE IF NOT EXISTS class_sessions (
  id text PRIMARY KEY, course_id text NOT NULL REFERENCES courses(id),
  cohort_id text NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  date text NOT NULL, mode text NOT NULL DEFAULT 'in-person', meeting_link text, topic text,
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS attendance (
  id text PRIMARY KEY, session_id text NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE, status text NOT NULL,
  UNIQUE (session_id, student_id)
);
CREATE TABLE IF NOT EXISTS assessments (
  id text PRIMARY KEY, course_id text REFERENCES courses(id), kind text NOT NULL, title text NOT NULL,
  instructions text, max_score integer NOT NULL DEFAULT 100, due_date text,
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS results (
  id text PRIMARY KEY, assessment_id text NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted', submission_text text, score integer, feedback text,
  submitted_at text, graded_at text, graded_by text REFERENCES users(id),
  UNIQUE (assessment_id, student_id)
);
CREATE TABLE IF NOT EXISTS requirement_logs (
  id text PRIMARY KEY, student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kind text NOT NULL, activity_date text NOT NULL, description text,
  status text NOT NULL DEFAULT 'pending', verified_by text REFERENCES users(id), verified_at text,
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS announcements (
  id text PRIMARY KEY, title text NOT NULL, body text NOT NULL, created_by text REFERENCES users(id),
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pastor boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_whatsapp boolean NOT NULL DEFAULT true;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS recording_url text;

CREATE TABLE IF NOT EXISTS applications (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL, phone text, location text,
  preferred_mode text NOT NULL DEFAULT 'in-person', message text, status text NOT NULL DEFAULT 'pending',
  reviewed_by text REFERENCES users(id), reviewed_at text, user_id text REFERENCES users(id),
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS internships (
  id text PRIMARY KEY, student_id text NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  ministry_unit text NOT NULL, supervisor_name text NOT NULL, supervisor_contact text, started_at text,
  signed_off boolean NOT NULL DEFAULT false, signed_off_by text REFERENCES users(id), signed_off_at text,
  supervisor_remarks text
);
CREATE TABLE IF NOT EXISTS internship_logs (
  id text PRIMARY KEY, student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_date text NOT NULL, hours real NOT NULL, description text, status text NOT NULL DEFAULT 'pending',
  verified_by text REFERENCES users(id), verified_at text,
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS care_requests (
  id text PRIMARY KEY, requester_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'CONCERN', subject text NOT NULL, message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text, updated_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS care_notes (
  id text PRIMARY KEY, request_id text NOT NULL REFERENCES care_requests(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id), note text NOT NULL,
  visible_to_requester boolean NOT NULL DEFAULT false,
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY, actor_id text, actor_name text, action text NOT NULL, entity text NOT NULL,
  entity_id text, detail text, created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);
CREATE TABLE IF NOT EXISTS notification_log (
  key text PRIMARY KEY, channel text NOT NULL, created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);

-- The audit log can never be edited or deleted, even by the app.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Supabase exposes public-schema tables through its REST API. Turn on Row Level Security with NO
-- policies so the public anon key can read nothing. The app connects directly as the postgres
-- role, which bypasses RLS, so it is unaffected.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','courses','cohorts','students','class_sessions','attendance','assessments',
    'results','requirement_logs','settings','announcements','applications','internships','internship_logs',
    'care_requests','care_notes','audit_log','notification_log']
  LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t); END LOOP;
END $$;

`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  await pool.query(DDL);
  await pool.end();
  console.log("Database tables ready.");
}
main().catch((e) => { console.error(e); process.exit(1); });
