"use server";
import { and, eq, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { resetRequests, users, passwordResets } from "../schema";
import { requireRole } from "../session";
import { audit } from "../audit";
import { notify, providerStatus } from "../notify";
import { createResetToken, findValidReset, resetUrl } from "../password-reset";
import { APP_NAME } from "../utils";

export type ForgotState = { ok?: boolean };
export type ResetState = { ok?: boolean; error?: string };
export type LinkState = { ok?: boolean; error?: string; url?: string; name?: string; phone?: string | null; hours?: number };

/**
 * PUBLIC. Always answers the same way, whether or not the account exists, so it cannot be used to find out
 * who is registered. If email is connected the link is emailed; otherwise the request waits for an admin.
 */
export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  if (String(formData.get("website") ?? "")) return { ok: true }; // honeypot
  const raw = String(formData.get("identifier") ?? "").trim().slice(0, 200);
  if (!raw) return { ok: true };
  const phone = raw.replace(/[\s\-().]/g, "");

  // Site-wide throttle against floods.
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(resetRequests).where(sql`${resetRequests.createdAt}::timestamp > (now() at time zone 'utc') - interval '1 hour'`);
  if (n >= 60) return { ok: true };

  const [user] = await db.select().from(users).where(or(eq(users.email, raw.toLowerCase()), eq(users.phone, phone)));
  if (!user) return { ok: true };

  // At most 3 requests per person per hour.
  const [{ mine }] = await db.select({ mine: sql<number>`count(*)::int` }).from(resetRequests).where(and(eq(resetRequests.userId, user.id), sql`${resetRequests.createdAt}::timestamp > (now() at time zone 'utc') - interval '1 hour'`));
  if (mine >= 3) return { ok: true };

  const requestId = randomUUID();
  await db.insert(resetRequests).values({ id: requestId, userId: user.id });

  let emailed = false;
  if (providerStatus().email && user.email && user.notifyEmail) {
    const token = await createResetToken(user.id, 1, null);
    const r = await notify(
      { id: user.id, email: user.email, notifyEmail: true }, null,
      `${APP_NAME}: reset your password`,
      `Hello ${user.name.split(" ")[0]}, use this link to choose a new password (valid for 1 hour, works once):\n\n${resetUrl(token)}\n\nIf you did not ask for this, ignore this message: your password has not changed.`
    );
    emailed = r.email === "sent";
    if (emailed) await db.update(resetRequests).set({ status: "handled", handledAt: new Date().toISOString() }).where(eq(resetRequests.id, requestId));
  }
  await audit(null, "password.reset_requested", "user", user.id, { name: user.name, emailed });
  revalidatePath("/dashboard/admin/password-resets");
  return { ok: true };
}

/** ADMIN: make a one-time link (24h) for a person, to send over WhatsApp or any other way. */
export async function generateResetLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { error: "Person not found." };
  const hours = 24;
  const token = await createResetToken(user.id, hours, admin.id);
  await db.update(resetRequests).set({ status: "handled", handledBy: admin.id, handledAt: new Date().toISOString() }).where(and(eq(resetRequests.userId, user.id), eq(resetRequests.status, "pending")));
  await audit(admin, "password.reset_link_created", "user", user.id, { name: user.name, hours });
  // No revalidatePath: re-rendering would remove the request row and hide the link the admin has to copy.
  return { ok: true, url: resetUrl(token), name: user.name, phone: user.phone, hours };
}

/** PUBLIC (needs a valid token): set the new password. */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (next.length > 200) return { error: "That password is too long." };
  if (next !== confirm) return { error: "The two passwords do not match." };
  const reset = await findValidReset(token);
  if (!reset) return { error: "This link has expired or was already used. Please ask for a new one." };

  const now = new Date().toISOString();
  const [user] = await db.update(users)
    .set({ passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false, passwordChangedAt: now })
    .where(eq(users.id, reset.userId)).returning();
  await db.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.userId, reset.userId));
  await db.update(resetRequests).set({ status: "handled", handledAt: now }).where(and(eq(resetRequests.userId, reset.userId), eq(resetRequests.status, "pending")));
  await audit(user ? { id: user.id, name: user.name } : null, "password.reset_completed", "user", reset.userId, { viaAdminLink: !!reset.createdBy });
  return { ok: true };
}
