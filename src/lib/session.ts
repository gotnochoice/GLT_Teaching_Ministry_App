import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { users } from "./schema";
import { dashboardPath, type Role } from "./utils";

export type SessionUser = { id: string; name: string; role: Role; isPastor: boolean; mustChangePassword: boolean };

/** Role/flags come from the database (not the JWT) so changes and deletions take effect immediately. Cached per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) return null;
  return { id: u.id, name: u.name, role: u.role as Role, isPastor: u.isPastor, mustChangePassword: u.mustChangePassword };
});

/** Use at the top of every page/action: redirects away if the wrong role. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/account?force=1");
  if (!roles.includes(user.role)) redirect(dashboardPath(user.role));
  return user;
}

/** Pastoral-care content: pastors only (a staff member flagged is_pastor). */
export async function requirePastor(): Promise<SessionUser> {
  const user = await requireRole("TEACHER", "ADMIN");
  if (!user.isPastor) redirect(dashboardPath(user.role));
  return user;
}
