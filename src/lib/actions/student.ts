"use server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { assessments, attendance, careRequests, classSessions, courses, internshipLogs, internships, requirementLogs, results, students } from "../schema";
import { requireRole } from "../session";
import { audit } from "../audit";
import { getStudentProgress } from "../progress";
import { todayISO, TOTAL_CLASSES } from "../utils";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refresh = () => revalidatePath("/dashboard", "layout");

async function myStudent() {
  const user = await requireRole("STUDENT");
  const [s] = await db.select().from(students).where(eq(students.userId, user.id));
  if (!s) throw new Error("No student record for this account");
  return { user, s };
}

export async function submitAssessment(formData: FormData) {
  const { s } = await myStudent();
  const assessmentId = str(formData, "assessmentId");
  const text = str(formData, "submissionText");
  const [a] = await db.select().from(assessments).where(eq(assessments.id, assessmentId));
  if (!a || !text) return;
  if (a.courseId) {
    const [c] = await db.select().from(courses).where(eq(courses.id, a.courseId));
    if (!c || c.number > s.currentClass) return; // only classes you have reached
  } else if (a.kind === "INTERNSHIP") {
    return; // assessed by staff, not self-submitted
  } else if (a.kind === "EXAM") {
    const p = await getStudentProgress(s.id, s.currentClass);
    if (p.classesCompleted < TOTAL_CLASSES) return; // exam opens after all 9 classes
  }
  const [existing] = await db.select().from(results).where(and(eq(results.assessmentId, assessmentId), eq(results.studentId, s.id)));
  if (existing?.status === "graded") return; // locked once graded
  if (existing) await db.update(results).set({ submissionText: text, submittedAt: new Date().toISOString() }).where(eq(results.id, existing.id));
  else await db.insert(results).values({ id: randomUUID(), assessmentId, studentId: s.id, status: "submitted", submissionText: text, submittedAt: new Date().toISOString() });
  refresh();
}

export async function logRequirement(formData: FormData) {
  const { s } = await myStudent();
  const kind = str(formData, "kind");
  if (kind !== "PRAYER" && kind !== "EVANGELISM") return;
  const date = str(formData, "activityDate") || todayISO();
  if (date > todayISO()) return;
  await db.insert(requirementLogs).values({ id: randomUUID(), studentId: s.id, kind, activityDate: date, description: str(formData, "description") || null });
  refresh();
}

/** Student says they watched the recording of a class they missed; a teacher must approve it. */
export async function requestMakeup(formData: FormData) {
  const { user, s } = await myStudent();
  const sessionId = str(formData, "sessionId");
  const [sess] = await db.select().from(classSessions).where(eq(classSessions.id, sessionId));
  if (!sess || sess.cohortId !== s.cohortId || !sess.recordingUrl || sess.date > todayISO()) return;
  const [row] = await db.select().from(attendance).where(and(eq(attendance.sessionId, sessionId), eq(attendance.studentId, s.id)));
  if (row && row.status !== "absent") return; // only for missed classes
  await db.insert(attendance).values({ id: randomUUID(), sessionId, studentId: s.id, status: "makeup_pending" })
    .onConflictDoUpdate({ target: [attendance.sessionId, attendance.studentId], set: { status: "makeup_pending" } });
  await audit(user, "attendance.makeup_requested", "class_session", sessionId, { student: user.name });
  refresh();
}

export async function saveInternshipDetails(formData: FormData) {
  const { user, s } = await myStudent();
  const unit = str(formData, "ministryUnit");
  const supervisor = str(formData, "supervisorName");
  if (!unit || !supervisor) return;
  const [existing] = await db.select().from(internships).where(eq(internships.studentId, s.id));
  if (existing?.signedOff) return; // locked after sign-off
  const v = { ministryUnit: unit, supervisorName: supervisor, supervisorContact: str(formData, "supervisorContact") || null, startedAt: str(formData, "startedAt") || null };
  if (existing) await db.update(internships).set(v).where(eq(internships.id, existing.id));
  else await db.insert(internships).values({ id: randomUUID(), studentId: s.id, ...v });
  await audit(user, "internship.details_saved", "internship", existing?.id ?? null, { student: user.name, ...v });
  refresh();
}

export async function logInternshipHours(formData: FormData) {
  const { s } = await myStudent();
  const hours = Number(formData.get("hours"));
  const date = str(formData, "activityDate") || todayISO();
  if (!(hours > 0 && hours <= 24) || date > todayISO()) return;
  const [p] = await db.select().from(internships).where(eq(internships.studentId, s.id));
  if (!p || p.signedOff) return; // need a placement first; closed after sign-off
  await db.insert(internshipLogs).values({ id: randomUUID(), studentId: s.id, activityDate: date, hours, description: str(formData, "description") || null });
  refresh();
}

/** Private to pastors. */
export async function submitCare(formData: FormData) {
  const { user } = await myStudent();
  const kind = str(formData, "kind");
  const subject = str(formData, "subject");
  const message = str(formData, "message");
  if (!["CONCERN", "PRAYER", "COUNSEL"].includes(kind) || !subject || !message || subject.length > 200 || message.length > 5000) return;
  const id = randomUUID();
  await db.insert(careRequests).values({ id, requesterId: user.id, kind, subject, message });
  await audit(user, "care.created", "care_request", id, { kind }); // no content in the audit log
  revalidatePath("/dashboard/student/care");
  revalidatePath("/dashboard/care");
}
