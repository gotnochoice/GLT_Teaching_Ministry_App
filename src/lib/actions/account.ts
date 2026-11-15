"use server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../schema";
import { getUser } from "../session";
import { audit } from "../audit";

export type AccountState = { ok?: boolean; error?: string };

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await getUser();
  if (!user) return { error: "Please log in again." };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "The new passwords do not match." };
  if (next === current) return { error: "Choose a password different from the current one." };
  const [u] = await db.select().from(users).where(eq(users.id, user.id));
  if (!u?.passwordHash || !(await bcrypt.compare(current, u.passwordHash))) return { error: "Current password is incorrect." };
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false }).where(eq(users.id, user.id));
  await audit(user, "password.changed", "user", user.id);
  return { ok: true };
}

export async function savePreferences(formData: FormData) {
  const user = await getUser();
  if (!user) return;
  await db.update(users).set({
    notifyEmail: formData.get("notifyEmail") === "on",
    notifyWhatsapp: formData.get("notifyWhatsapp") === "on",
    phone: String(formData.get("phone") ?? "").replace(/[\s\-().]/g, "") || null,
  }).where(eq(users.id, user.id));
}
