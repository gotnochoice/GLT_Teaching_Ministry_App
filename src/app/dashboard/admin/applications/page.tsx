import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications, cohorts } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { rejectApplication } from "@/lib/actions/applications";
import { ApproveForm } from "@/components/forms/approve-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export default async function AdminApplications() {
  await requireRole("ADMIN");
  const all = await db.select().from(applications).orderBy(desc(applications.createdAt));
  const active = await db.select().from(cohorts).where(eq(cohorts.status, "active"));
  const pending = all.filter((a) => a.status === "pending");
  const done = all.filter((a) => a.status !== "pending").slice(0, 30);
  return (
    <>
      <PageHeader title="Join requests" description="People who asked to join through the public form. Approving creates their student account." />
      {pending.length === 0 ? <Empty>No pending requests.</Empty> : (
        <div className="space-y-4">
          {pending.map((a) => (
            <Card key={a.id}><CardContent className="space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{a.name}</span><Badge variant="outline">{a.preferredMode}</Badge>
                <span className="text-xs text-gray-500">{formatDate(a.createdAt)}</span>
              </div>
              <p className="text-gray-600">{a.email}{a.phone ? ` · ${a.phone}` : ""}{a.location ? ` · ${a.location}` : ""}</p>
              {a.message && <p className="rounded bg-gray-50 p-2 text-gray-700">{a.message}</p>}
              <div className="flex flex-wrap items-start gap-4">
                <ApproveForm id={a.id} cohorts={active.map((c) => ({ id: c.id, name: c.name }))} />
                <form action={rejectApplication}><input type="hidden" name="id" value={a.id} /><Button size="sm" variant="outline" type="submit">Reject</Button></form>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-lg font-semibold">Handled</h2>
          <Card><CardContent className="divide-y p-0">
            {done.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium">{a.name}</span><span className="text-gray-500">{a.email}</span>
                <Badge variant={a.status === "approved" ? "success" : "destructive"}>{a.status}</Badge>
              </div>
            ))}
          </CardContent></Card>
        </>
      )}
    </>
  );
}
