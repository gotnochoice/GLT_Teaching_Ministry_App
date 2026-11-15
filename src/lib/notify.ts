import { eq } from "drizzle-orm";
import { db } from "./db";
import { notificationLog } from "./schema";

/** Email via Resend, WhatsApp via Twilio. Both are optional: unconfigured channels are skipped, never faked. */

export function providerStatus() {
  return {
    email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM),
  };
}

/** Digits-only local numbers (e.g. 0803...) become E.164 using DEFAULT_COUNTRY_CODE (default Nigeria, 234). */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.replace(/[\s\-().]/g, "");
  if (raw.startsWith("+")) return /^\+\d{8,15}$/.test(raw) ? raw : null;
  const cc = process.env.DEFAULT_COUNTRY_CODE ?? "234";
  const digits = raw.replace(/^0+/, "");
  const full = raw.startsWith("00") ? `+${raw.slice(2)}` : `+${cc}${digits}`;
  return /^\+\d{8,15}$/.test(full) ? full : null;
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

export async function sendWhatsApp(phone: string, text: string): Promise<SendResult> {
  if (!providerStatus().whatsapp) return "skipped";
  const to = toE164(phone);
  if (!to) return "failed";
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const res = await fetch(`${process.env.TWILIO_API_BASE ?? "https://api.twilio.com"}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`, To: `whatsapp:${to}`, Body: text }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

type Recipient = { id: string; email: string | null; phone: string | null; notifyEmail: boolean; notifyWhatsapp: boolean };

/**
 * Notify one person on every channel they allow. `key` makes it idempotent:
 * a (key, channel) pair is claimed in notification_log BEFORE sending and released if the send fails,
 * so cron re-runs and retries never double-send.
 */
export async function notify(r: Recipient, key: string | null, subject: string, text: string) {
  const out = { email: "skipped" as SendResult, whatsapp: "skipped" as SendResult };
  const attempt = async (channel: "email" | "whatsapp", send: () => Promise<SendResult>) => {
    if (key) {
      const claimed = await db.insert(notificationLog).values({ key: `${key}:${channel}`, channel }).onConflictDoNothing().returning();
      if (claimed.length === 0) return "skipped" as SendResult; // already sent
    }
    const result = await send();
    if (result !== "sent" && key) await db.delete(notificationLog).where(eq(notificationLog.key, `${key}:${channel}`));
    return result;
  };
  if (r.email && r.notifyEmail) out.email = await attempt("email", () => sendEmail(r.email!, subject, text));
  if (r.phone && r.notifyWhatsapp) out.whatsapp = await attempt("whatsapp", () => sendWhatsApp(r.phone!, `${subject}\n\n${text}`));
  return out;
}
