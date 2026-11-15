"use server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { assessments, attendance, classSessions, internshipLogs, internships, requirementLogs, results, students } from "../schema";
import { requireRole } from "../session";
import { maybeAdvance } from "../progress";
import { audit } from "../audit";
import { studentName } from "../queries";

/** Actions shared by TEACHER and ADMIN. */
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refresh = () => revalidatePath("/dashboard", "layout");

export async function gradeResult(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const assessmentId = str(formData, "assessmentId");
  const studentId = str(formData, "studentId");
  const score = Number(formData.get("score"));
  const feedback = str(formData, "feedback") || null;
  const [a] = await db.select().from(assessments).where(eq(assessments.id, assessmentId));
  if (!a || Number.isNaN(score) || score < 0 || score > a.maxScore) return;

  const [existing] = await db.select().from(results)
    .where(and(eq(results.assessmentId, assessmentId), eq(results.studentId, studentId)));
  const values = { status: "graded", score, feedback, gradedAt: new Date().toISOString(), gradedBy: user.id };
  if (existing) await db.update(results).set(values).where(eq(results.id, existing.id));
  else await db.insert(results).values({ id: randomUUID(), assessmentId, studentId, submittedAt: new Date().toISOString(), ...values });

  await audit(user, existing?.status === "graded" ? "grade.changed" : "grade.set", "result", existing?.id ?? null, {
    student: await studentName(studentId), assessment: a.title, from: existing?.score ?? null, to: score, max: a.maxScore,
  });

  const [s] = await db.select().from(students).where(eq(students.id, studentId));
  if (s && s.status === "active") {
    const next = await maybeAdvance(s.id, s.currentClass);
    if (next !== s.currentClass) {
      await db.update(students).set({ currentClass: next }).where(eq(students.id, s.id));
      await audit(user, "student.advanced", "student", s.id, { student: await studentName(s.id), from: s.currentClass, to: next });
    }
  }
  refresh();
}

/** Let a student retake a failed test/assignment/exam: clears the graded result so they can resubmit. */
export async function allowRetake(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const id = str(formData, "id");
  const [r] = await db.select().from(results).where(eq(results.id, id));
  if (!r) return;
  const [a] = await db.select().from(assessments).where(eq(assessments.id, r.assessmentId));
  if (!a || a.kind === "INTERNSHIP") return; // internship is re-graded, not retaken
  await db.delete(results).where(eq(results.id, id));
  await audit(user, "retake.allowed", "result", id, { student: await studentName(r.studentId), assessment: a.title, clearedScore: r.score, max: a.maxScore });
  refresh();
}

export async function reviewLog(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const id = str(formData, "id");
  const decision = str(formData, "decision");
  if (decision !== "verified" && decision !== "rejected") return;
  const [l] = await db.select().from(requirementLogs).where(eq(requirementLogs.id, id));
  if (!l) return;
  await db.update(requirementLogs).set({ status: decision, verifiedBy: user.id, verifiedAt: new Date().toISOString() }).where(eq(requirementLogs.id, id));
  await audit(user, `requirement.${decision}`, "requirement_log", id, { student: await studentName(l.studentId), kind: l.kind, date: l.activityDate });
  refresh();
}

export async function createSession(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const date = str(formData, "date");
  if (!date) return;
  const id = randomUUID();
  await db.insert(classSessions).values({
    id, courseId: str(formData, "courseId"), cohortId: str(formData, "cohortId"), date,
    mode: str(formData, "mode") || "in-person",
    meetingLink: str(formData, "meetingLink") || null, topic: str(formData, "topic") || null,
    recordingUrl: str(formData, "recordingUrl") || null,
  });
  await audit(user, "session.created", "class_session", id, { date });
  refresh();
}

export async function setRecording(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const id = str(formData, "sessionId");
  const url = str(formData, "recordingUrl");
  if (url && !/^https?:\/\//i.test(url)) return;
  await db.update(classSessions).set({ recordingUrl: url || null }).where(eq(classSessions.id, id));
  await audit(user, "session.recording", "class_session", id, { url: url || null });
  refresh();
}

const STAFF_ATTENDANCE = ["present", "absent", "excused", "makeup", "makeup_pending"];

export async function saveAttendance(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const sessionId = str(formData, "sessionId");
  const before = new Map((await db.select().from(attendance).where(eq(attendance.sessionId, sessionId))).map((r) => [r.studentId, r.status]));
  const changes: { student: string; from: string | null; to: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("att_")) continue;
    const studentId = key.slice(4);
    const status = String(value);
    if (!STAFF_ATTENDANCE.includes(status)) continue;
    if (before.get(studentId) !== status) changes.push({ student: await studentName(studentId), from: before.get(studentId) ?? null, to: status });
    await db.insert(attendance).values({ id: randomUUID(), sessionId, studentId, status })
      .onConflictDoUpdate({ target: [attendance.sessionId, attendance.studentId], set: { status } });
  }
  if (changes.length) await audit(user, "attendance.saved", "class_session", sessionId, { changes });
  refresh();
}

export async function reviewInternshipHours(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const id = str(formData, "id");
  const decision = str(formData, "decision");
  if (decision !== "verified" && decision !== "rejected") return;
  const [l] = await db.select().from(internshipLogs).where(eq(internshipLogs.id, id));
  if (!l) return;
  await db.update(internshipLogs).set({ status: decision, verifiedBy: user.id, verifiedAt: new Date().toISOString() }).where(eq(internshipLogs.id, id));
  await audit(user, `internship.hours.${decision}`, "internship_log", id, { student: await studentName(l.studentId), hours: l.hours, date: l.activityDate });
  refresh();
}

/** Records the supervisor's sign-off (the supervisor is usually outside the portal). */
export async function signOffInternship(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const studentId = str(formData, "studentId");
  const remarks = str(formData, "remarks") || null;
  const [p] = await db.select().from(internships).where(eq(internships.studentId, studentId));
  if (!p) return;
  await db.update(internships).set({ signedOff: true, signedOffBy: user.id, signedOffAt: new Date().toISOString(), supervisorRemarks: remarks }).where(eq(internships.id, p.id));
  await audit(user, "internship.signed_off", "internship", p.id, { student: await studentName(studentId), supervisor: p.supervisorName, remarks });
  refresh();
}
