import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cohorts, students, users } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { createCohort, setCohortGroup } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

const sel = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm";

export default async function AdminCohorts() {
  await requireRole("ADMIN");
  const teachers = await db.select().from(users).where(eq(users.role, "TEACHER"));
  const list = await db.select({ c: cohorts, t: users }).from(cohorts).leftJoin(users, eq(users.id, cohorts.teacherId)).orderBy(cohorts.startDate);
  const counts = new Map<string, number>();
  for (const s of await db.select().from(students)) if (s.cohortId && s.status === "active") counts.set(s.cohortId, (counts.get(s.cohortId) ?? 0) + 1);
  return (
    <>
      <PageHeader title="Cohorts" description="A cohort is a group that goes through the nine classes together. Students leave a cohort by graduating." />
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">New cohort</CardTitle></CardHeader>
        <CardContent>
          <form action={createCohort} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5"><Label>Name</Label><Input name="name" placeholder="e.g. Sunday Cohort B" required /></div>
            <div className="space-y-1.5"><Label>Start date</Label><Input name="startDate" type="date" /></div>
            <div className="space-y-1.5"><Label>Mode</Label><select name="mode" className={sel}><option value="in-person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></div>
            <div className="space-y-1.5"><Label>Lead teacher</Label><select name="teacherId" className={sel}><option value="">— none —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>WhatsApp group invite link (optional)</Label><Input name="whatsappGroupUrl" placeholder="https://chat.whatsapp.com/…" /></div>
            <div className="flex items-end"><Button type="submit">Create cohort</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card><CardContent className="divide-y p-0">
        {list.map(({ c, t }) => (
          <div key={c.id} className="space-y-2 px-5 py-3 text-sm">
           <div className="flex flex-wrap items-center gap-3">
            <span className="flex-1 font-medium">{c.name}</span>
            <Badge variant="outline">{c.mode}</Badge>
            <span className="text-gray-500">Starts {formatDate(c.startDate)}</span>
            <span className="text-gray-500">Teacher: {t?.name ?? "unassigned"}</span>
            <span className="font-medium">{counts.get(c.id) ?? 0} active</span>
           </div>
           <form action={setCohortGroup} className="flex flex-wrap items-center gap-2">
             <input type="hidden" name="id" value={c.id} />
             <Input name="whatsappGroupUrl" defaultValue={c.whatsappGroupUrl ?? ""} placeholder="WhatsApp group invite link (https://chat.whatsapp.com/…)" className="h-9 max-w-lg" />
             <Button size="sm" variant="outline" type="submit">Save group link</Button>
           </form>
          </div>
        ))}
      </CardContent></Card>
    </>
  );
}
