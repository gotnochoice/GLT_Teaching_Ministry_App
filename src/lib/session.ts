import { redirect } from "next/navigation";
import { auth } from "./auth";
import { dashboardPath, type Role } from "./utils";

export type SessionUser = { id: string; name: string; role: Role };

export async function getUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as { id?: string; name?: string; role?: Role } | undefined;
  if (!u?.id || !u.role) return null;
  return { id: u.id, name: u.name ?? "", role: u.role };
}

/** Use at the top of every page/action: redirects away if the wrong role. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(dashboardPath(user.role));
  return user;
}
