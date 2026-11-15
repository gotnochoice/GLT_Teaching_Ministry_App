import { eq } from "drizzle-orm";
import { db } from "./db";
import { notificationLog } from "./schema";

/** Automatic reminders go by email (Resend). WhatsApp is deliberately NOT automated: it uses free click-to-chat links and cohort group links instead. */

export function providerStatus() {
  return {
    email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };
}

export type SendResult = "sent" | "skipped" | "failed";

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (!providerStatus().email) return "skipped";
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

type Recipient = { id: string; email: string | null; notifyEmail: boolean };

/**
 * Email one person (if they allow it). `key` makes it idempotent:
 * a (key, channel) pair is claimed in notification_log BEFORE sending and released if the send fails,
 * so cron re-runs and retries never double-send.
 */
export async function notify(r: Recipient, key: string | null, subject: string, text: string) {
  const out = { email: "skipped" as SendResult };
  const attempt = async (channel: "email", send: () => Promise<SendResult>) => {
    if (key) {
      const claimed = await db.insert(notificationLog).values({ key: `${key}:${channel}`, channel }).onConflictDoNothing().returning();
      if (claimed.length === 0) return "skipped" as SendResult; // already sent
    }
    const result = await send();
    if (result !== "sent" && key) await db.delete(notificationLog).where(eq(notificationLog.key, `${key}:${channel}`));
    return result;
  };
  if (r.email && r.notifyEmail) out.email = await attempt("email", () => sendEmail(r.email!, subject, text));
  return out;
}
