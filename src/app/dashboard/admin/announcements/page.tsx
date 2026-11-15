import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { createAnnouncement } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export default async function AdminAnnouncements() {
  await requireRole("ADMIN");
  const list = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return (
    <>
      <PageHeader title="Announcements" description="Shown on every student's dashboard." action={<a href="#add" className="inline-flex h-9 items-center rounded-md bg-brand px-3 text-sm font-medium text-white lg:hidden">+ Add</a>} />
      <div className="flex flex-col">
      <Card id="add" className="order-2 mt-8 scroll-mt-20 lg:order-1 lg:mt-0 mb-8"><CardHeader><CardTitle className="text-base">New announcement</CardTitle></CardHeader><CardContent>
        <form action={createAnnouncement} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input name="title" required /></div>
          <div className="space-y-1.5"><Label>Message</Label><Textarea name="body" rows={3} required /></div>
          <Button type="submit">Post</Button>
        </form>
      </CardContent></Card>
      <div className="order-1 space-y-3 lg:order-2">{list.map((a) => (<Card key={a.id}><CardContent className="p-5 text-sm"><p className="font-semibold">{a.title} <span className="font-normal text-gray-400">· {formatDate(a.createdAt)}</span></p><p className="mt-1 text-gray-600">{a.body}</p></CardContent></Card>))}</div>
      </div>
    </>
  );
}
