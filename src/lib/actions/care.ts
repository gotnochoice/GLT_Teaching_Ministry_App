"use server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { careNotes, careRequests } from "../schema";
import { requirePastor } from "../session";
import { audit } from "../audit";

export async function addCareNote(formData: FormData) {
  const pastor = await requirePastor();
  const requestId = String(formData.get("requestId"));
  const note = String(formData.get("note") ?? "").trim();
  if (!note || note.length > 5000) return;
  const [r] = await db.select().from(careRequests).where(eq(careRequests.id, requestId));
  if (!r) return;
  await db.insert(careNotes).values({ id: randomUUID(), requestId, authorId: pastor.id, note, visibleToRequester: formData.get("visible") === "on" });
  await db.update(careRequests).set({ updatedAt: new Date().toISOString(), status: r.status === "open" ? "in_progress" : r.status }).where(eq(careRequests.id, requestId));
  await audit(pastor, "care.note_added", "care_request", requestId, { visibleToRequester: formData.get("visible") === "on" });
  revalidatePath(`/dashboard/care/${requestId}`);
}

export async function setCareStatus(formData: FormData) {
  const pastor = await requirePastor();
  const requestId = String(formData.get("requestId"));
  const status = String(formData.get("status"));
  if (!["open", "in_progress", "closed"].includes(status)) return;
  await db.update(careRequests).set({ status, updatedAt: new Date().toISOString() }).where(eq(careRequests.id, requestId));
  await audit(pastor, "care.status", "care_request", requestId, { status });
  revalidatePath("/dashboard/care", "layout");
}
