import { randomUUID } from "crypto";
import { db } from "./db";
import { auditLog } from "./schema";

type Actor = { id: string; name: string } | null;

/** Append a row to the (DB-enforced append-only) audit log. Never throws into the caller's flow. */
export async function audit(actor: Actor, action: string, entity: string, entityId?: string | null, detail?: Record<string, unknown>) {
  try {
    await db.insert(auditLog).values({
      id: randomUUID(),
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "system",
      action,
      entity,
      entityId: entityId ?? null,
      detail: detail ? JSON.stringify(detail) : null,
    });
  } catch (e) {
    console.error("audit failed", action, e);
  }
}
