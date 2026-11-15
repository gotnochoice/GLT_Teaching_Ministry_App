"use server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { assessments, courses, requirementLogs, results, students } from "../schema";
import { requireRole } from "../session";
import { todayISO, TOTAL_CLASSES } from "../utils";
import { getStudentProgress } from "../progress";

async function myStudent() {
  const user = await requireRole("STUDENT");
  const [s] = await db.select().from(students).where(eq(students.userId, user.id));
  if (!s) throw new Error("No student record for this account");
  return s;
}

export async function submitAssessment(formData: FormData) {
  const s = await myStudent();
  const assessmentId = String(formData.get("assessmentId"));
  const text = String(formData.get("submissionText") ?? "").trim();
  const [a] = await db.select().from(assessments).where(eq(assessments.id, assessmentId));
  if (!a || !text) return;
  // Students may only submit TEST/ASSIGNMENT for classes they have reached.
  if (a.courseId) {
    const [c] = await db.select().from(courses).where(eq(courses.id, a.courseId));
    if (!c || c.number > s.currentClass) return;
  } else if (a.kind === "INTERNSHIP") {
    return; // internship is assessed by teachers/supervisors, not self-submitted
  } else if (a.kind === "EXAM") {
    const p = await getStudentProgress(s.id, s.currentClass);
    if (p.classesCompleted < TOTAL_CLASSES) return; // exam opens after all 9 classes
  }
  const [existing] = await db
    .select()
    .from(results)
    .where(and(eq(results.assessmentId, assessmentId), eq(results.studentId, s.id)));
  if (existing?.status === "graded") return; // locked once graded
  if (existing) {
    await db.update(results).set({ submissionText: text, submittedAt: new Date().toISOString() }).where(eq(results.id, existing.id));
  } else {
    await db.insert(results).values({
      id: randomUUID(), assessmentId, studentId: s.id, status: "submitted",
      submissionText: text, submittedAt: new Date().toISOString(),
    });
  }
  revalidatePath("/dashboard/student", "layout");
}

export async function logRequirement(formData: FormData) {
  const s = await myStudent();
  const kind = String(formData.get("kind"));
  if (kind !== "PRAYER" && kind !== "EVANGELISM") return;
  await db.insert(requirementLogs).values({
    id: randomUUID(), studentId: s.id, kind,
    activityDate: String(formData.get("activityDate") || todayISO()),
    description: String(formData.get("description") ?? "").trim() || null,
  });
  revalidatePath("/dashboard/student", "layout");
}
