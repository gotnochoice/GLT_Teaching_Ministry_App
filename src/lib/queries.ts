import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { cohorts, students, users } from "./schema";

export async function getMyStudent(userId: string) {
  const [row] = await db
    .select({ student: students, user: users, cohort: cohorts })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .leftJoin(cohorts, eq(cohorts.id, students.cohortId))
    .where(eq(students.userId, userId));
  if (!row) throw new Error("No student record for this account");
  return row;
}

export async function listStudents() {
  return db
    .select({ student: students, user: users, cohort: cohorts })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .leftJoin(cohorts, eq(cohorts.id, students.cohortId))
    .orderBy(desc(students.enrolledAt), users.name);
}

/** Teachers see students in cohorts they lead; admins see everyone. */
export async function listScopedStudents(user: { id: string; role: string }) {
  const all = await listStudents();
  if (user.role === "ADMIN") return all;
  return all.filter((r) => r.cohort?.teacherId === user.id);
}
