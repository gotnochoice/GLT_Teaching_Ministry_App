import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { careNotes, careRequests, users } from "@/lib/schema";
import { requirePastor } from "@/lib/session";
import { addCareNote, setCareStatus } from "@/lib/actions/care";
import { audit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { WaLink } from "@/components/ui/wa-link";
import { formatDate } from "@/lib/utils";

export default async function CareDetail({ params }: { params: Promise<{ id: string }> }) {
  const pastor = await requirePastor();
  const { id } = await params;
  const [row] = await db.select({ r: careRequests, u: users }).from(careRequests).innerJoin(users, eq(users.id, careRequests.requesterId)).where(eq(careRequests.id, id));
  if (!row) notFound();
  await audit(pastor, "care.viewed", "care_request", id); // accountability: who opened it (no content logged)
  const notes = await db.select({ n: careNotes, a: users }).from(careNotes).innerJoin(users, eq(users.id, careNotes.authorId)).where(eq(careNotes.requestId, id)).orderBy(careNotes.createdAt);
  const { r, u } = row;
  return (
    <>
      <PageHeader title={r.subject} description={`From ${u.name}${u.phone ? ` · ${u.phone}` : ""}${u.email ? ` · ${u.email}` : ""} · ${formatDate(r.createdAt)}`} />
      <Card className="mb-6"><CardContent className="space-y-3 p-5 text-sm">
        <div className="flex items-center gap-2"><WaLink phone={u.phone} text={`Hello ${u.name.split(" ")[0]}, this is the pastoral team following up. `} label="Message on WhatsApp" /><Badge variant="outline">{r.kind.toLowerCase()}</Badge><Badge variant="warning">{r.status.replace("_", " ")}</Badge></div>
        <p className="whitespace-pre-wrap">{r.message}</p>
        <form action={setCareStatus} className="flex flex-wrap gap-2 pt-2">
          <input type="hidden" name="requestId" value={r.id} />
          {["open", "in_progress", "closed"].map((s) => <Button key={s} size="sm" variant={r.status === s ? "default" : "outline"} name="status" value={s}>{s.replace("_", " ")}</Button>)}
        </form>
      </CardContent></Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pastoral notes</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {notes.map(({ n, a }) => (
            <div key={n.id} className="rounded-md bg-gray-50 p-3"><p className="mb-1 text-xs text-gray-500">{a.name} · {formatDate(n.createdAt)} {n.visibleToRequester ? "· shared with student" : "· private"}</p><p className="whitespace-pre-wrap">{n.note}</p></div>
          ))}
          <form action={addCareNote} className="space-y-2">
            <input type="hidden" name="requestId" value={r.id} />
            <Textarea name="note" rows={3} required placeholder="Add a note…" />
            <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" name="visible" /> Share this note with the student</label>
            <Button size="sm" type="submit">Add note</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
