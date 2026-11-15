import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";
import { providerStatus } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const channels = providerStatus();
  if (!channels.email) return NextResponse.json({ ok: true, skipped: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)", channels });
  return NextResponse.json({ ok: true, ...(await runReminders()), channels });
}
