"use server";
import { and, eq, gt, sql } from "drizzle-orm";
import { randomInt, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db";
import { applications, students, users } from "../schema";
import { requireRole } from "../session";
import { audit } from "../audit";
import { notify } from "../notify";
import { APP_NAME, todayISO } from "../utils";

export type JoinState = { ok?: boolean; error?: string };

const Join = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(100).optional(),
  preferredMode: z.enum(["in-person", "online"]),
  message: z.string().trim().max(1000).optional(),
});

/** PUBLIC (no login). Always answers the same on success paths so it cannot be used to discover who has an account. */
export async function submitApplication(_prev: JoinState, formData: FormData): Promise<JoinState> {
  if (String(formData.get("website") ?? "")) return { ok: true }; // honeypot: bots fill this, humans never see it
  const parsed = Join.safeParse({
    name: formData.get("name"), email: formData.get("email"), phone: formData.get("phone") || undefined,
    location: formData.get("location") || undefined, preferredMode: formData.get("preferredMode"), message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { error: "Please check your details: name and a valid email are required." };
  const d = parsed.data;

  // Global throttle: at most 40 new requests per hour across the whole site.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(applications).where(gt(applications.createdAt, since));
  if (n >= 40) return { error: "We are receiving a lot of requests right now. Please try again later." };

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email));
  const [pending] = await db.select({ id: applications.id }).from(applications).where(and(eq(applications.email, d.email), eq(applications.status, "pending")));
  if (!existingUser && !pending) {
    await db.insert(applications).values({
      id: randomUUID(), name: d.name, email: d.email, phone: d.phone?.replace(/[\s\-().]/g, "") || null,
      location: d.location || null, preferredMode: d.preferredMode, message: d.message || null,
    });
    revalidatePath("/dashboard/admin/applications");
  }
  return { ok: true };
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike characters
const tempPassword = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export type ApproveState = { ok?: boolean; error?: string; name?: string; email?: string; phone?: string | null; password?: string; emailed?: string };

export async function approveApplication(_prev: ApproveState, formData: FormData): Promise<ApproveState> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const cohortId = String(formData.get("cohortId") ?? "") || null;
  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app || app.status !== "pending") return { error: "This request was already handled." };
  const [dupe] = await db.select({ id: users.id }).from(users).where(eq(users.email, app.email));
  if (dupe) return { error: "An account with this email already exists." };

  const password = tempPassword();
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId, name: app.name, email: app.email, phone: app.phone, role: "STUDENT",
    passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true,
  });
  await db.insert(students).values({ id: randomUUID(), userId, cohortId, currentClass: 1, enrolledAt: todayISO() });
  await db.update(applications).set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date().toISOString(), userId }).where(eq(applications.id, id));
  await audit(admin, "application.approved", "application", id, { name: app.name, cohortId });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const sent = await notify(
    { id: userId, email: app.email, notifyEmail: true },
    null,
    `Welcome to ${APP_NAME}`,
    `Hello ${app.name}, your request to join has been approved.\n\nLogin: ${site}/login\nEmail: ${app.email}\nTemporary password: ${password}\n\nYou will be asked to choose a new password the first time you log in.`
  );
  // No revalidatePath here on purpose: re-rendering would drop this request from the pending list and
  // unmount the form that shows the one-time password. The admin dismisses the panel ("Done"), which refreshes.
  return { ok: true, name: app.name, email: app.email, phone: app.phone, password, emailed: sent.email };
}

export async function rejectApplication(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app || app.status !== "pending") return;
  await db.update(applications).set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date().toISOString() }).where(eq(applications.id, id));
  await audit(admin, "application.rejected", "application", id, { name: app.name });
  revalidatePath("/dashboard", "layout");
}
