import { desc, eq, inArray, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { careNotes, careRequests } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { submitCare } from "@/lib/actions/student";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { Lock } from "lucide-react";

const KIND: Record<string, string> = { CONCERN: "A concern", PRAYER: "Prayer request", COUNSEL: "I'd like counsel" };

export default async function StudentCare() {
  const user = await requireRole("STUDENT");
  const mine = await db.select().from(careRequests).where(eq(careRequests.requesterId, user.id)).orderBy(desc(careRequests.createdAt));
  const replies = mine.length ? await db.select().from(careNotes).where(and(inArray(careNotes.requestId, mine.map((m) => m.id)), eq(careNotes.visibleToRequester, true))).orderBy(careNotes.createdAt) : [];
  return (
    <>
      <PageHeader title="Pastoral care" description="Share a concern, a prayer request, or ask to speak with a pastor." />
      <p className="mb-6 flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800"><Lock className="h-4 w-4 shrink-0" /> Only the church&apos;s pastors can read what you write here. Your teachers and the admin team cannot.</p>
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">New request</CardTitle><CardDescription>If someone is in danger, please call the church or emergency services directly instead.</CardDescription></CardHeader>
        <CardContent>
          <form action={submitCare} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="kind">What is this?</Label>
              <select id="kind" name="kind" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" required maxLength={200} /></div>
            <div className="space-y-1.5"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" rows={5} required maxLength={5000} /></div>
            <Button type="submit">Send to the pastors</Button>
          </form>
        </CardContent>
      </Card>
      {mine.length > 0 && <h2 className="mb-3 text-lg font-semibold">Your requests</h2>}
      <div className="space-y-3">
        {mine.map((r) => (
          <Card key={r.id}><CardContent className="space-y-2 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.subject}</span><Badge variant="outline">{KIND[r.kind]}</Badge><Badge variant={r.status === "closed" ? "success" : "warning"}>{r.status.replace("_", " ")}</Badge><span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span></div>
            <p className="whitespace-pre-wrap text-gray-600">{r.message}</p>
            {replies.filter((n) => n.requestId === r.id).map((n) => <p key={n.id} className="rounded bg-gray-50 p-2"><b>Pastor:</b> {n.note}</p>)}
          </CardContent></Card>
        ))}
      </div>
    </>
  );
}
