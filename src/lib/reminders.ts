import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "./db";
import { assessments, classSessions, cohorts, courses, requirementLogs, results, students, users, attendance, internshipLogs } from "./schema";
import { notify } from "./notify";
import { APP_NAME, classLabel } from "./utils";

/** DB-default timestamps look like "2026-11-12 23:00:00"; make them ISO so they compare correctly with toISOString() values. */
const iso = (t: string | null | undefined) => (t ?? "").replace(" ", "T");
const dayISO = (offset: number) => new Date(Date.now() + offset * 86400_000).toISOString().split("T")[0];

type Counts = { sessionReminders: number; dueReminders: number; teacherDigests: number };

/** Runs daily from Vercel Cron. Every send is idempotent via notification_log keys, so re-runs are safe. */
export async function runReminders(): Promise<Counts> {
  const out: Counts = { sessionReminders: 0, dueReminders: 0, teacherDigests: 0 };
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const activeStudents = await db.select({ s: students, u: users }).from(students).innerJoin(users, eq(users.id, students.userId)).where(eq(students.status, "active"));
  const toRecipient = (u: typeof users.$inferSelect) => ({ id: u.id, email: u.email, notifyEmail: u.notifyEmail });
  const sent = (r: { email: string }) => r.email === "sent";

  // 1) Classes happening tomorrow
  const tomorrow = dayISO(1);
  const sessions = await db.select({ x: classSessions, c: courses }).from(classSessions).innerJoin(courses, eq(courses.id, classSessions.courseId)).where(eq(classSessions.date, tomorrow));
  for (const { x, c } of sessions) {
    for (const { u } of activeStudents.filter((r) => r.s.cohortId === x.cohortId)) {
      const where = x.mode === "online" ? `Online${x.meetingLink ? `: ${x.meetingLink}` : ""}` : "In person";
      const r = await notify(toRecipient(u), `session:${x.id}:${u.id}`, `${APP_NAME}: class tomorrow`,
        `Hello ${u.name.split(" ")[0]}, a reminder that ${classLabel(c)} (${c.title}) holds tomorrow. ${where}.`);
      if (sent(r)) out.sessionReminders++;
    }
  }

  // 2) Tests/assignments due within 2 days that the student has not submitted
  const due = await db.select({ a: assessments, c: courses }).from(assessments).leftJoin(courses, eq(courses.id, assessments.courseId)).where(and(gte(assessments.dueDate, dayISO(0)), lte(assessments.dueDate, dayISO(2))));
  for (const { a, c } of due) {
    const existing = await db.select().from(results).where(eq(results.assessmentId, a.id));
    const done = new Set(existing.map((r) => r.studentId));
    for (const { s, u } of activeStudents) {
      if (done.has(s.id)) continue;
      if (c && c.number > s.currentClass) continue; // not unlocked for them yet
      const r = await notify(toRecipient(u), `due:${a.id}:${u.id}`, `${APP_NAME}: due soon`,
        `Hello ${u.name.split(" ")[0]}, "${a.title}" is due on ${a.dueDate}. Log in to submit it${site ? `: ${site}/dashboard/student/classes` : "."}`);
      if (sent(r)) out.dueReminders++;
    }
  }

  // 3) One daily digest per teacher: things waiting for them for 3+ days
  const cutoff = new Date(Date.now() - 3 * 86400_000).toISOString();
  const leads = await db.select({ c: cohorts, u: users }).from(cohorts).innerJoin(users, eq(users.id, cohorts.teacherId)).where(eq(cohorts.status, "active"));
  for (const { u } of new Map(leads.map((l) => [l.u.id, l])).values()) {
    const mine = activeStudents.filter((r) => leads.some((l) => l.u.id === u.id && l.c.id === r.s.cohortId)).map((r) => r.s.id);
    if (!mine.length) continue;
    const grade = (await db.select().from(results).where(and(inArray(results.studentId, mine), eq(results.status, "submitted")))).filter((r) => (r.submittedAt ?? "") < cutoff).length;
    const logs = (await db.select().from(requirementLogs).where(and(inArray(requirementLogs.studentId, mine), eq(requirementLogs.status, "pending")))).filter((r) => iso(r.createdAt) < cutoff).length;
    const hours = (await db.select().from(internshipLogs).where(and(inArray(internshipLogs.studentId, mine), eq(internshipLogs.status, "pending")))).filter((r) => iso(r.createdAt) < cutoff).length;
    const makeups = (await db.select().from(attendance).where(and(inArray(attendance.studentId, mine), eq(attendance.status, "makeup_pending")))).length;
    if (grade + logs + hours + makeups === 0) continue;
    const r = await notify(toRecipient(u), `digest:${u.id}:${dayISO(0)}`, `${APP_NAME}: waiting for you`,
      `Hello ${u.name.split(" ")[0]}, waiting on you: ${grade} submission(s) to grade, ${logs} prayer/evangelism entries, ${hours} internship hour log(s), ${makeups} make-up request(s).`);
    if (sent(r)) out.teacherDigests++;
  }
  return out;
}
