import { desc, eq, inArray, lte } from "drizzle-orm";
import { db } from "./db";
import { assessments, attendance, classSessions, courses, results, students } from "./schema";
import { classLabel, todayISO } from "./utils";

export type AdminChartData = {
  newStudents: { month: string; students: number }[];
  perClass: { cls: string; students: number }[];
  attendance: { label: string; rate: number; className: string; present: number; total: number }[];
  avgGrade: { cls: string; tests: number | null; assignments: number | null }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** All figures can be narrowed to one cohort (cohortId) or cover everyone (undefined). */
export async function getAdminChartData(cohortId?: string): Promise<AdminChartData> {
  const everyone = await db.select().from(students);
  const allCourses = await db.select().from(courses).orderBy(courses.number);
  const labelOf = (n: number) => { const c = allCourses.find((x) => x.number === n); return c ? classLabel(c) : `Class ${n}`; };
  const all = cohortId ? everyone.filter((s) => s.cohortId === cohortId) : everyone;
  const ids = new Set(all.map((s) => s.id));

  // 1) New students per month, last 6 months (by enrolment date)
  const now = new Date();
  const buckets: { key: string; month: string; students: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ key: d.toISOString().slice(0, 7), month: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, students: 0 });
  }
  for (const s of all) {
    const b = buckets.find((x) => x.key === (s.enrolledAt ?? "").slice(0, 7));
    if (b) b.students++;
  }

  // 2) Active students in each of the 9 classes
  const perClass = Array.from({ length: 9 }, (_, i) => ({ cls: labelOf(i + 1), students: all.filter((s) => s.status === "active" && s.currentClass === i + 1).length }));

  // 3) Attendance for the 8 most recent Sundays that have recorded attendance (which class, how many came)
  const sessions = await db
    .select({ s: classSessions, c: courses })
    .from(classSessions)
    .innerJoin(courses, eq(courses.id, classSessions.courseId))
    .where(lte(classSessions.date, todayISO()))
    .orderBy(desc(classSessions.date))
    .limit(60);
  const scoped = cohortId ? sessions.filter((x) => x.s.cohortId === cohortId) : sessions;
  const rows = scoped.length ? await db.select().from(attendance).where(inArray(attendance.sessionId, scoped.map((x) => x.s.id))) : [];
  const att = scoped
    .map(({ s, c }) => {
      const r = rows.filter((x) => x.sessionId === s.id && x.status !== "excused");
      const present = r.filter((x) => x.status === "present" || x.status === "makeup").length;
      return r.length ? { date: s.date, label: `${s.date.slice(8, 10)}/${s.date.slice(5, 7)}`, rate: Math.round((present / r.length) * 100), className: `${classLabel(c)}: ${c.title}`, present, total: r.length } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 8)
    .reverse()
    .map((x) => ({ label: x.label, rate: x.rate, className: x.className, present: x.present, total: x.total }));

  // 4) Average graded score (%) per class, tests and assignments shown separately
  const graded = await db
    .select({ score: results.score, max: assessments.maxScore, number: courses.number, kind: assessments.kind, studentId: results.studentId })
    .from(results)
    .innerJoin(assessments, eq(assessments.id, results.assessmentId))
    .innerJoin(courses, eq(courses.id, assessments.courseId))
    .where(eq(results.status, "graded"));
  const mine = graded.filter((g) => g.score !== null && (!cohortId || ids.has(g.studentId)));
  const avg = (n: number, kind: string) => {
    const g = mine.filter((x) => x.number === n && x.kind === kind);
    return g.length ? Math.round(g.reduce((a, x) => a + (x.score! / x.max) * 100, 0) / g.length) : null;
  };
  const avgGrade = Array.from({ length: 9 }, (_, i) => ({ cls: labelOf(i + 1), tests: avg(i + 1, "TEST"), assignments: avg(i + 1, "ASSIGNMENT") }));

  return { newStudents: buckets.map(({ month, students }) => ({ month, students })), perClass, attendance: att, avgGrade };
}
