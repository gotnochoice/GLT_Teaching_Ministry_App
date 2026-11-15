import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID as uid } from "crypto";

// Placeholder curriculum — rename in Admin → Curriculum or edit here.
const CLASSES: [string, string][] = [
  ["Foundations of Faith", "Salvation, assurance, and the new birth."],
  ["Knowing the Bible", "How to read, study and apply Scripture."],
  ["Prayer & Fellowship with God", "Building a daily prayer life."],
  ["The Holy Spirit", "Who the Holy Spirit is and how He works in the believer."],
  ["Walking in Holiness", "Character, repentance and spiritual disciplines."],
  ["The Church & Community", "Belonging, serving and honouring leadership."],
  ["Evangelism & Witnessing", "Sharing the gospel with confidence."],
  ["Stewardship & Giving", "Time, talent and treasure."],
  ["Purpose, Calling & Ministry", "Discovering and serving in your gift."],
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  const q = (sql: string, p: unknown[] = []) => pool.query(sql, p);
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD ?? "password123", 10);

  const settings: Record<string, string> = {
    pass_mark: "50", prayers_required: "2", evangelism_required: "2",
    weight_classwork: "50", weight_exam: "30", weight_internship: "20",
    min_attendance_pct: "80", internship_hours_required: "20",
  };
  for (const [k, v] of Object.entries(settings))
    await q("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING", [k, v]);

  const courseIds: string[] = [];
  for (const [i, [title, description]] of CLASSES.entries()) {
    const id = `course-${i + 1}`;
    courseIds.push(id);
    await q("INSERT INTO courses(id,number,title,description) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", [id, i + 1, title, description]);
    await q("INSERT INTO assessments(id,course_id,kind,title) VALUES($1,$2,'TEST',$3) ON CONFLICT DO NOTHING", [`test-${i + 1}`, id, `Class ${i + 1} Test`]);
    await q("INSERT INTO assessments(id,course_id,kind,title) VALUES($1,$2,'ASSIGNMENT',$3) ON CONFLICT DO NOTHING", [`assign-${i + 1}`, id, `Class ${i + 1} Assignment`]);
  }
  await q("INSERT INTO assessments(id,kind,title,instructions) VALUES('exam','EXAM','Final Exam','Covers all nine classes.') ON CONFLICT DO NOTHING");
  await q("INSERT INTO assessments(id,kind,title,instructions) VALUES('internship','INTERNSHIP','Ministry Internship','Serve in a ministry unit; your supervisor submits your assessment.') ON CONFLICT DO NOTHING");

  const user = async (id: string, name: string, email: string, role: string) => {
    await q("INSERT INTO users(id,name,email,role,password_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [id, name, email, role, hash]);
    return id;
  };
  await user("u-admin", "Admin User", "admin@church.test", "ADMIN");
  await user("u-teacher", "Pastor Grace Adeyemi", "teacher@church.test", "TEACHER");
  await q("INSERT INTO cohorts(id,name,mode,start_date,teacher_id) VALUES('cohort-1','Sunday Cohort A','hybrid','2026-09-06','u-teacher') ON CONFLICT DO NOTHING");

  const demo: [string, string, number][] = [
    ["Tunde Bakare", "tunde@church.test", 3],
    ["Ngozi Okafor", "ngozi@church.test", 1],
    ["Samuel Etim", "samuel@church.test", 6],
  ];
  for (const [i, [name, email, cls]] of demo.entries()) {
    const uidd = await user(`u-student-${i + 1}`, name, email, "STUDENT");
    const sid = `student-${i + 1}`;
    await q("INSERT INTO students(id,user_id,cohort_id,current_class,enrolled_at) VALUES($1,$2,'cohort-1',$3,'2026-09-06') ON CONFLICT DO NOTHING", [sid, uidd, cls]);
    for (let c = 1; c < cls; c++) {
      for (const a of [`test-${c}`, `assign-${c}`])
        await q("INSERT INTO results(id,assessment_id,student_id,status,score,submitted_at,graded_at,graded_by) VALUES($1,$2,$3,'graded',$4,now()::text,now()::text,'u-teacher') ON CONFLICT DO NOTHING", [uid(), a, sid, 60 + ((c * 7 + i * 5) % 36)]);
    }
  }
  await q("INSERT INTO requirement_logs(id,student_id,kind,activity_date,description,status,verified_by) VALUES($1,'student-3','PRAYER','2026-10-04','Prayer meeting','verified','u-teacher')", [uid()]).catch(() => {});
  // Demo: the lead teacher is also a pastor; three past Sundays, one with a recording.
  await q("UPDATE users SET is_pastor = true WHERE id = 'u-teacher'");
  const past = (d: number) => new Date(Date.now() - d * 86400_000).toISOString().split("T")[0];
  for (const [i, d] of [21, 14, 7].entries()) {
    await q("INSERT INTO class_sessions(id,course_id,cohort_id,date,mode,recording_url) VALUES($1,'course-1','cohort-1',$2,'in-person',$3) ON CONFLICT DO NOTHING", [`sess-${i + 1}`, past(d), i === 1 ? "https://example.org/recording" : null]);
    for (const [j, sid] of ["student-1", "student-2", "student-3"].entries()) {
      const status = j === 1 && i > 0 ? "absent" : "present";
      await q("INSERT INTO attendance(id,session_id,student_id,status) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", [`att-${i}-${j}`, `sess-${i + 1}`, sid, status]);
    }
  }
  await q("INSERT INTO announcements(id,title,body,created_by) VALUES('ann-1','Welcome to the new cohort','Classes hold every Sunday after service. Online students use the link on the Sessions page.','u-admin') ON CONFLICT DO NOTHING");

  await pool.end();
  console.log("Seeded. Demo logins (password: password123): admin@church.test, teacher@church.test, tunde@church.test");
}
main().catch((e) => { console.error(e); process.exit(1); });
