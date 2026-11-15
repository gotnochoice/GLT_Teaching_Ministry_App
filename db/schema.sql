-- GLT Life Foundation Bible School: database schema.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run again (it only adds what is missing).
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
ALTER TABLE courses ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pastor boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_whatsapp boolean NOT NULL DEFAULT true;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS recording_url text;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS whatsapp_group_url text;

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

-- Forgot password: one-time reset tokens (only a hash is stored) and "please help me reset" requests.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at text;
CREATE TABLE IF NOT EXISTS password_resets (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, expires_at text NOT NULL, used_at text,
  created_by text, created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);
CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id);
CREATE TABLE IF NOT EXISTS reset_requests (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', handled_by text, handled_at text,
  created_at text DEFAULT (now() AT TIME ZONE 'UTC')::text
);

-- The audit log can never be edited or deleted, even by the app.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Matric numbers: GLTIFE/<YYMM of enrolment>/<NNN>. The sequence restarts at 001 each month.
ALTER TABLE students ADD COLUMN IF NOT EXISTS matric_no text;
CREATE UNIQUE INDEX IF NOT EXISTS students_matric_no_key ON students (matric_no);
CREATE TABLE IF NOT EXISTS matric_counters (period text PRIMARY KEY, last integer NOT NULL DEFAULT 0);
-- Give every existing student without one a number, oldest first, so nobody is left without.
DO $$
DECLARE r record; p text; n integer;
BEGIN
  FOR r IN SELECT id, COALESCE(NULLIF(enrolled_at, ''), now()::date::text)::date AS d
           FROM students WHERE matric_no IS NULL ORDER BY enrolled_at NULLS LAST, id
  LOOP
    p := to_char(r.d, 'YYMM');
    INSERT INTO matric_counters AS c (period, last) VALUES (p, 1)
      ON CONFLICT (period) DO UPDATE SET last = c.last + 1 RETURNING c.last INTO n;
    UPDATE students SET matric_no = 'GLTIFE/' || p || '/' || lpad(n::text, 3, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Starter data (safe to re-run: never overwrites anything an admin has edited).
-- The 9 class titles are placeholders: rename them in Admin -> Curriculum.
INSERT INTO courses (id, number, code, title, description) VALUES
  ('course-1', 1, 'MMC 101', 'Membership Class I', 'Welcome to God''s Family · Church and Church Attendance (Intro to GLT & You 1) · Importance of Growing up Spiritually'),
  ('course-2', 2, 'MMC 102', 'Membership Class II', 'Why Salvation? · A Brand New Man'),
  ('course-3', 3, 'MMC 103', 'Membership Class III', 'Holy Spirit and You · Why Tongues?'),
  ('course-4', 4, 'BFC 201', 'Basic Foundation Class I', 'Understanding the Integrity of God''s Word · The Just Shall Live by Faith'),
  ('course-5', 5, 'BFC 202', 'Basic Foundation Class II', 'Understanding Righteousness · Fellowshipping with the Father'),
  ('course-6', 6, 'BFC 203', 'Basic Foundation Class III', 'Renewing the Mind · Quiet Time'),
  ('course-7', 7, 'BFC 204', 'Basic Foundation Class IV', 'Understanding the Elementary Principles of Christ I: Repentance from Dead Works, Faith Toward God, Baptisms'),
  ('course-8', 8, 'BFC 205', 'Basic Foundation Class V', 'Understanding the Elementary Principles of Christ II: Laying on of Hands, Resurrection of the Dead, Eternal Judgement'),
  ('course-9', 9, 'BFC 206', 'Basic Foundation Class VI', 'Walking in Love · You Are Not an Accident · GLT and You 2 · Abounding in Thanksgiving')
ON CONFLICT DO NOTHING;
UPDATE courses SET code = CASE number
  WHEN 1 THEN 'MMC 101' WHEN 2 THEN 'MMC 102' WHEN 3 THEN 'MMC 103'
  WHEN 4 THEN 'BFC 201' WHEN 5 THEN 'BFC 202' WHEN 6 THEN 'BFC 203'
  WHEN 7 THEN 'BFC 204' WHEN 8 THEN 'BFC 205' WHEN 9 THEN 'BFC 206' END
WHERE code IS NULL AND id = 'course-' || number;
UPDATE courses c SET title = n.title, description = n.description
  FROM (VALUES
    (1, 'Foundations of Faith', 'Membership Class I', 'Welcome to God''s Family · Church and Church Attendance (Intro to GLT & You 1) · Importance of Growing up Spiritually'),
    (2, 'Knowing the Bible', 'Membership Class II', 'Why Salvation? · A Brand New Man'),
    (3, 'Prayer & Fellowship with God', 'Membership Class III', 'Holy Spirit and You · Why Tongues?'),
    (4, 'The Holy Spirit', 'Basic Foundation Class I', 'Understanding the Integrity of God''s Word · The Just Shall Live by Faith'),
    (5, 'Walking in Holiness', 'Basic Foundation Class II', 'Understanding Righteousness · Fellowshipping with the Father'),
    (6, 'The Church & Community', 'Basic Foundation Class III', 'Renewing the Mind · Quiet Time'),
    (7, 'Evangelism & Witnessing', 'Basic Foundation Class IV', 'Understanding the Elementary Principles of Christ I: Repentance from Dead Works, Faith Toward God, Baptisms'),
    (8, 'Stewardship & Giving', 'Basic Foundation Class V', 'Understanding the Elementary Principles of Christ II: Laying on of Hands, Resurrection of the Dead, Eternal Judgement'),
    (9, 'Purpose, Calling & Ministry', 'Basic Foundation Class VI', 'Walking in Love · You Are Not an Accident · GLT and You 2 · Abounding in Thanksgiving')
  ) AS n(number, old_title, title, description)
  WHERE c.number = n.number AND c.title = n.old_title;
INSERT INTO assessments (id, course_id, kind, title)
  SELECT 'test-' || number, id, 'TEST', COALESCE(code, 'Class ' || number) || ' Test' FROM courses WHERE id LIKE 'course-%'
ON CONFLICT DO NOTHING;
INSERT INTO assessments (id, course_id, kind, title)
  SELECT 'assign-' || number, id, 'ASSIGNMENT', COALESCE(code, 'Class ' || number) || ' Assignment' FROM courses WHERE id LIKE 'course-%'
ON CONFLICT DO NOTHING;
UPDATE assessments a SET title = c.code || CASE a.kind WHEN 'TEST' THEN ' Test' ELSE ' Assignment' END
  FROM courses c
  WHERE a.course_id = c.id AND c.code IS NOT NULL AND a.kind IN ('TEST', 'ASSIGNMENT')
    AND a.title = 'Class ' || c.number || CASE a.kind WHEN 'TEST' THEN ' Test' ELSE ' Assignment' END;
INSERT INTO assessments (id, kind, title, instructions) VALUES
  ('exam', 'EXAM', 'Written and Oral Exam', 'Covers all nine classes. Submit your written paper here; your teacher records one combined score after your oral exam.'),
  ('internship', 'INTERNSHIP', 'Ministry Internship', 'Serve in a ministry unit; your supervisor submits your assessment.')
ON CONFLICT DO NOTHING;
UPDATE assessments SET title = 'Written and Oral Exam',
  instructions = 'Covers all nine classes. Submit your written paper here; your teacher records one combined score after your oral exam.'
  WHERE id = 'exam' AND title = 'Final Exam' AND instructions = 'Covers all nine classes.';
INSERT INTO settings (key, value) VALUES
  ('pass_mark','50'), ('prayers_required','2'), ('evangelism_required','2'),
  ('weight_classwork','50'), ('weight_exam','30'), ('weight_internship','20'),
  ('min_attendance_pct','80'), ('internship_hours_required','20')
ON CONFLICT DO NOTHING;

-- Supabase exposes public-schema tables through its REST API. Turn on Row Level Security with NO
-- policies so the public anon key can read nothing. The app connects directly as the postgres
-- role, which bypasses RLS, so it is unaffected.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','courses','cohorts','students','class_sessions','attendance','assessments',
    'results','requirement_logs','settings','announcements','applications','internships','internship_logs',
    'care_requests','care_notes','audit_log','notification_log','matric_counters','password_resets','reset_requests']
  LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t); END LOOP;
END $$;

