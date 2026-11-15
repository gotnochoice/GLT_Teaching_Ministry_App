"use server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { announcements, assessments, cohorts, courses, settings, students, users } from "../schema";
import { requireRole } from "../session";
import { getStudentProgress } from "../progress";
import { todayISO } from "../utils";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createUser(formData: FormData) {
  await requireRole("ADMIN");
  const role = str(formData, "role");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(role) || !name || !email || password.length < 8) return;
  const id = randomUUID();
  await db.insert(users).values({
    id, name, email, role,
    phone: str(formData, "phone").replace(/[\s\-().]/g, "") || null,
    passwordHash: await bcrypt.hash(password, 10),
  });
  if (role === "STUDENT") {
    await db.insert(students).values({
      id: randomUUID(), userId: id, cohortId: str(formData, "cohortId") || null,
      currentClass: 1, enrolledAt: todayISO(),
    });
  }
  revalidatePath("/dashboard", "layout");
}

export async function updateStudent(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  const status = str(formData, "status");
  const currentClass = Number(str(formData, "currentClass"));
  if (!["active", "paused", "withdrawn"].includes(status) || !(currentClass >= 1 && currentClass <= 9)) return;
  await db.update(students).set({
    status, currentClass, cohortId: str(formData, "cohortId") || null,
  }).where(eq(students.id, id));
  revalidatePath("/dashboard", "layout");
}

/** Graduate only if every requirement is met (server-side check, not just a hidden button). */
export async function graduateStudent(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  const [s] = await db.select().from(students).where(eq(students.id, id));
  if (!s || s.status === "graduated") return;
  const p = await getStudentProgress(s.id, s.currentClass);
  if (!p.eligibleToGraduate) return;
  await db.update(students).set({ status: "graduated", graduatedAt: todayISO() }).where(eq(students.id, id));
  revalidatePath("/dashboard", "layout");
}

export async function createCohort(formData: FormData) {
  await requireRole("ADMIN");
  const name = str(formData, "name");
  if (!name) return;
  await db.insert(cohorts).values({
    id: randomUUID(), name, mode: str(formData, "mode") || "in-person",
    startDate: str(formData, "startDate") || null, teacherId: str(formData, "teacherId") || null,
  });
  revalidatePath("/dashboard", "layout");
}

export async function updateCourse(formData: FormData) {
  await requireRole("ADMIN");
  const title = str(formData, "title");
  if (!title) return;
  await db.update(courses).set({ title, description: str(formData, "description") || null }).where(eq(courses.id, str(formData, "id")));
  revalidatePath("/dashboard", "layout");
}

export async function updateAssessment(formData: FormData) {
  await requireRole("ADMIN");
  const maxScore = Number(str(formData, "maxScore"));
  if (!(maxScore > 0)) return;
  await db.update(assessments).set({
    title: str(formData, "title"), instructions: str(formData, "instructions") || null,
    dueDate: str(formData, "dueDate") || null, maxScore,
  }).where(eq(assessments.id, str(formData, "id")));
  revalidatePath("/dashboard", "layout");
}

export async function saveSettings(formData: FormData) {
  await requireRole("ADMIN");
  const keys = ["pass_mark", "prayers_required", "evangelism_required", "weight_classwork", "weight_exam", "weight_internship"];
  for (const key of keys) {
    const value = Number(str(formData, key));
    if (Number.isNaN(value) || value < 0) continue;
    await db.insert(settings).values({ key, value: String(value) }).onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
  }
  revalidatePath("/dashboard", "layout");
}

export async function createAnnouncement(formData: FormData) {
  const user = await requireRole("ADMIN");
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title || !body) return;
  await db.insert(announcements).values({ id: randomUUID(), title, body, createdBy: user.id });
  revalidatePath("/dashboard", "layout");
}
