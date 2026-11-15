import { createHash, randomBytes, randomUUID } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "./db";
import { passwordResets } from "./schema";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Creates a fresh single-use reset token and returns the raw token (shown/sent once, never stored).
 * Any earlier unused token for the same person is cancelled, so only the newest link works.
 */
export async function createResetToken(userId: string, hours: number, createdBy: string | null): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.update(passwordResets).set({ usedAt: now.toISOString() }).where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));
  await db.insert(passwordResets).values({
    id: randomUUID(), userId, tokenHash: hashToken(token), createdBy,
    expiresAt: new Date(now.getTime() + hours * 3600_000).toISOString(),
  });
  return token;
}

/** The reset row for a token, only if it is unused and not expired. */
export async function findValidReset(token: string | undefined | null) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const [row] = await db.select().from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, hashToken(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date().toISOString())));
  return row ?? null;
}

export function resetUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/reset-password?token=${encodeURIComponent(token)}`;
}
