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
