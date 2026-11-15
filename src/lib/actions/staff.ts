"use server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { assessments, attendance, classSessions, requirementLogs, results, students } from "../schema";
import { requireRole } from "../session";
import { maybeAdvance } from "../progress";

/** Actions shared by TEACHER and ADMIN. */

export async function gradeResult(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const assessmentId = String(formData.get("assessmentId"));
  const studentId = String(formData.get("studentId"));
  const score = Number(formData.get("score"));
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  const [a] = await db.select().from(assessments).where(eq(assessments.id, assessmentId));
  if (!a || Number.isNaN(score) || score < 0 || score > a.maxScore) return;

  const [existing] = await db
    .select().from(results)
    .where(and(eq(results.assessmentId, assessmentId), eq(results.studentId, studentId)));
  const values = { status: "graded", score, feedback, gradedAt: new Date().toISOString(), gradedBy: user.id };
  if (existing) await db.update(results).set(values).where(eq(results.id, existing.id));
  else await db.insert(results).values({ id: randomUUID(), assessmentId, studentId, submittedAt: new Date().toISOString(), ...values });

  const [s] = await db.select().from(students).where(eq(students.id, studentId));
  if (s && s.status === "active") {
    const next = await maybeAdvance(s.id, s.currentClass);
    if (next !== s.currentClass) await db.update(students).set({ currentClass: next }).where(eq(students.id, s.id));
  }
  revalidatePath("/dashboard", "layout");
}

export async function reviewLog(formData: FormData) {
  const user = await requireRole("TEACHER", "ADMIN");
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (decision !== "verified" && decision !== "rejected") return;
  await db.update(requirementLogs)
    .set({ status: decision, verifiedBy: user.id, verifiedAt: new Date().toISOString() })
    .where(eq(requirementLogs.id, id));
  revalidatePath("/dashboard", "layout");
}

export async function createSession(formData: FormData) {
  await requireRole("TEACHER", "ADMIN");
  const date = String(formData.get("date"));
  if (!date) return;
  await db.insert(classSessions).values({
    id: randomUUID(),
    courseId: String(formData.get("courseId")),
    cohortId: String(formData.get("cohortId")),
    date,
    mode: String(formData.get("mode") || "in-person"),
    meetingLink: String(formData.get("meetingLink") ?? "").trim() || null,
    topic: String(formData.get("topic") ?? "").trim() || null,
  });
  revalidatePath("/dashboard", "layout");
}

export async function saveAttendance(formData: FormData) {
  await requireRole("TEACHER", "ADMIN");
  const sessionId = String(formData.get("sessionId"));
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("att_")) continue;
    const studentId = key.slice(4);
    const status = String(value);
    if (!["present", "absent", "excused"].includes(status)) continue;
    await db.insert(attendance)
      .values({ id: randomUUID(), sessionId, studentId, status })
      .onConflictDoUpdate({ target: [attendance.sessionId, attendance.studentId], set: { status } });
  }
  revalidatePath("/dashboard", "layout");
}

/** Let a student retake a failed test/assignment/exam: clears the graded result so they can resubmit. */
export async function allowRetake(formData: FormData) {
  await requireRole("TEACHER", "ADMIN");
  const id = String(formData.get("id"));
  const [r] = await db.select().from(results).where(eq(results.id, id));
  if (!r) return;
  const [a] = await db.select().from(assessments).where(eq(assessments.id, r.assessmentId));
  if (!a || a.kind === "INTERNSHIP") return; // internship is re-graded, not retaken
  await db.delete(results).where(eq(results.id, id));
  revalidatePath("/dashboard", "layout");
}
