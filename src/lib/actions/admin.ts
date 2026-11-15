"use server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { announcements, assessments, cohorts, courses, settings, students, users } from "../schema";
import { requireRole } from "../session";
import { getRules, getStudentProgress } from "../progress";
import { audit } from "../audit";
import { studentName } from "../queries";
import { todayISO } from "../utils";
import { nextMatricNo } from "../matric";
import { isWhatsAppGroupLink, toE164 } from "../phone";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refresh = () => revalidatePath("/dashboard", "layout");

export async function createUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const role = str(formData, "role");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(role) || !name || !email || password.length < 8) return;
  const [dupe] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (dupe) return;
  const id = randomUUID();
  await db.insert(users).values({
    id, name, email, role,
    phone: str(formData, "phone").replace(/[\s\-().]/g, "") || null,
    passwordHash: await bcrypt.hash(password, 10),
    mustChangePassword: true, // the temporary password must be replaced at first login
  });
  let matricNo: string | undefined;
  if (role === "STUDENT") {
    matricNo = await nextMatricNo();
    await db.insert(students).values({ id: randomUUID(), userId: id, cohortId: str(formData, "cohortId") || null, currentClass: 1, enrolledAt: todayISO(), matricNo });
  }
  await audit(admin, "user.created", "user", id, { name, role, ...(matricNo ? { matricNo } : {}) });
  refresh();
}

export async function setPastor(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(formData, "id");
  const value = str(formData, "value") === "true";
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u || u.role === "STUDENT") return; // pastors are staff
  await db.update(users).set({ isPastor: value }).where(eq(users.id, id));
  await audit(admin, value ? "pastor.granted" : "pastor.revoked", "user", id, { name: u.name });
  refresh();
}

export async function updateStudent(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(formData, "id");
  const status = str(formData, "status");
  const currentClass = Number(str(formData, "currentClass"));
  if (!["active", "paused", "withdrawn"].includes(status) || !(currentClass >= 1 && currentClass <= 9)) return;
  const [before] = await db.select().from(students).where(eq(students.id, id));
  const cohortId = str(formData, "cohortId") || null;
  await db.update(students).set({ status, currentClass, cohortId }).where(eq(students.id, id));
  await audit(admin, "student.updated", "student", id, {
    student: await studentName(id),
    from: { status: before?.status, class: before?.currentClass, cohort: before?.cohortId },
    to: { status, class: currentClass, cohort: cohortId },
  });
  refresh();
}

/** Graduate only if every requirement is met (server-side check, not just a hidden button). */
export async function graduateStudent(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(formData, "id");
  const [s] = await db.select().from(students).where(eq(students.id, id));
  if (!s || s.status === "graduated") return;
  const p = await getStudentProgress(s.id, s.currentClass);
  if (!p.eligibleToGraduate) return;
  await db.update(students).set({ status: "graduated", graduatedAt: todayISO() }).where(eq(students.id, id));
  await audit(admin, "student.graduated", "student", id, { student: await studentName(id), overall: p.overall });
  refresh();
}

export async function createCohort(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const name = str(formData, "name");
  if (!name) return;
  const id = randomUUID();
  const group = str(formData, "whatsappGroupUrl");
  if (group && !isWhatsAppGroupLink(group)) return; // must be a chat.whatsapp.com invite link
  await db.insert(cohorts).values({ id, name, mode: str(formData, "mode") || "in-person", startDate: str(formData, "startDate") || null, teacherId: str(formData, "teacherId") || null, whatsappGroupUrl: group || null });
  await audit(admin, "cohort.created", "cohort", id, { name });
  refresh();
}

export async function updateCourse(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const title = str(formData, "title");
  if (!title) return;
  await db.update(courses).set({ title, description: str(formData, "description") || null }).where(eq(courses.id, str(formData, "id")));
  await audit(admin, "course.updated", "course", str(formData, "id"), { title });
  refresh();
}

export async function updateAssessment(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const maxScore = Number(str(formData, "maxScore"));
  if (!(maxScore > 0)) return;
  const id = str(formData, "id");
  const [before] = await db.select().from(assessments).where(eq(assessments.id, id));
  await db.update(assessments).set({ title: str(formData, "title"), instructions: str(formData, "instructions") || null, dueDate: str(formData, "dueDate") || null, maxScore }).where(eq(assessments.id, id));
  await audit(admin, "assessment.updated", "assessment", id, { title: str(formData, "title"), maxScoreFrom: before?.maxScore, maxScoreTo: maxScore });
  refresh();
}

const SETTING_KEYS = ["pass_mark", "prayers_required", "evangelism_required", "weight_classwork", "weight_exam", "weight_internship", "min_attendance_pct", "internship_hours_required"];

export async function saveSettings(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const rules = await getRules();
  const before: Record<string, number> = {
    pass_mark: rules.passMark, prayers_required: rules.prayersRequired, evangelism_required: rules.evangelismRequired,
    weight_classwork: rules.weightClasswork, weight_exam: rules.weightExam, weight_internship: rules.weightInternship,
    min_attendance_pct: rules.minAttendancePct, internship_hours_required: rules.internshipHoursRequired,
  };
  const changed: Record<string, { from: number; to: number }> = {};
  for (const key of SETTING_KEYS) {
    const value = Number(str(formData, key));
    if (Number.isNaN(value) || value < 0 || (key.endsWith("_pct") || key === "pass_mark") && value > 100) continue;
    await db.insert(settings).values({ key, value: String(value) }).onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
    if (before[key] !== value) changed[key] = { from: before[key], to: value };
  }
  if (Object.keys(changed).length) await audit(admin, "settings.changed", "settings", null, changed);
  refresh();
}

export async function createAnnouncement(formData: FormData) {
  const user = await requireRole("ADMIN");
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title || !body) return;
  const id = randomUUID();
  await db.insert(announcements).values({ id, title, body, createdBy: user.id });
  await audit(user, "announcement.created", "announcement", id, { title });
  refresh();
}

export async function setCohortGroup(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(formData, "id");
  const url = str(formData, "whatsappGroupUrl");
  if (url && !isWhatsAppGroupLink(url)) return;
  await db.update(cohorts).set({ whatsappGroupUrl: url || null }).where(eq(cohorts.id, id));
  await audit(admin, "cohort.whatsapp_group", "cohort", id, { url: url || null });
  refresh();
}

/** The church office's WhatsApp number, used by the public "Chat with us" button on /join. */
export async function saveOfficeWhatsapp(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const raw = str(formData, "officeWhatsapp");
  const e164 = raw ? toE164(raw) : "";
  if (raw && !e164) return;
  await db.insert(settings).values({ key: "office_whatsapp", value: e164 ?? "" }).onConflictDoUpdate({ target: settings.key, set: { value: e164 ?? "" } });
  await audit(admin, "settings.office_whatsapp", "settings", null, { to: e164 || null });
  refresh();
  revalidatePath("/join");
}
