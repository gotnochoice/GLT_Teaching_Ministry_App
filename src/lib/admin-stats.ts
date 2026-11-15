import { desc, eq, inArray, lte } from "drizzle-orm";
import { db } from "./db";
import { assessments, attendance, classSessions, courses, results, students } from "./schema";
import { todayISO } from "./utils";

export type AdminChartData = {
  newStudents: { month: string; students: number }[];
  perClass: { cls: string; students: number }[];
  attendance: { date: string; rate: number }[];
  avgGrade: { cls: string; average: number }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getAdminChartData(): Promise<AdminChartData> {
  const all = await db.select().from(students);

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
  const perClass = Array.from({ length: 9 }, (_, i) => ({ cls: `Class ${i + 1}`, students: all.filter((s) => s.status === "active" && s.currentClass === i + 1).length }));

  // 3) Attendance rate for the 8 most recent sessions that have recorded attendance
  const past = await db.select().from(classSessions).where(lte(classSessions.date, todayISO())).orderBy(desc(classSessions.date)).limit(30);
  const rows = past.length ? await db.select().from(attendance).where(inArray(attendance.sessionId, past.map((p) => p.id))) : [];
  const att = past
    .map((p) => {
      const r = rows.filter((x) => x.sessionId === p.id && x.status !== "excused");
      const ok = r.filter((x) => x.status === "present" || x.status === "makeup").length;
      return { date: p.date, rate: r.length ? Math.round((ok / r.length) * 100) : null };
    })
    .filter((x): x is { date: string; rate: number } => x.rate !== null)
    .slice(0, 8)
    .reverse()
    .map((x) => ({ date: x.date.slice(5).replace("-", "/"), rate: x.rate }));

  // 4) Average graded score (%) of class tests and assignments, per class
  const graded = await db
    .select({ score: results.score, max: assessments.maxScore, number: courses.number })
    .from(results)
    .innerJoin(assessments, eq(assessments.id, results.assessmentId))
    .innerJoin(courses, eq(courses.id, assessments.courseId))
    .where(eq(results.status, "graded"));
  const avgGrade = Array.from({ length: 9 }, (_, i) => {
    const g = graded.filter((x) => x.number === i + 1 && x.score !== null);
    return { cls: `Class ${i + 1}`, average: g.length ? Math.round(g.reduce((a, x) => a + (x.score! / x.max) * 100, 0) / g.length) : 0 };
  });

  return { newStudents: buckets.map(({ month, students }) => ({ month, students })), perClass, attendance: att, avgGrade };
}
