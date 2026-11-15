import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { internshipLogs } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { logInternshipHours, saveInternshipDetails } from "@/lib/actions/student";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader, ProgressBar, StatusBadge } from "@/components/ui/misc";
import { formatDate, todayISO } from "@/lib/utils";

export default async function StudentInternship() {
  const user = await requireRole("STUDENT");
  const { student } = await getMyStudent(user.id);
  const p = await getStudentProgress(student.id, student.currentClass);
  const w = p.internshipWork;
  const logs = await db.select().from(internshipLogs).where(eq(internshipLogs.studentId, student.id)).orderBy(desc(internshipLogs.activityDate));
  const locked = !!w.placement?.signedOff;
  return (
    <>
      <PageHeader title="Internship" description="Serve in a ministry unit under a supervisor. Log your hours; a teacher verifies them, records your supervisor's sign-off and grades the internship." />
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Placement</CardTitle>
            <CardDescription>{locked ? "Signed off — details are locked." : "Where you serve and who supervises you."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveInternshipDetails} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="ministryUnit">Ministry unit</Label><Input id="ministryUnit" name="ministryUnit" defaultValue={w.placement?.ministryUnit ?? ""} required disabled={locked} placeholder="e.g. Children's church, Ushering, Media" /></div>
              <div className="space-y-1.5"><Label htmlFor="supervisorName">Supervisor name</Label><Input id="supervisorName" name="supervisorName" defaultValue={w.placement?.supervisorName ?? ""} required disabled={locked} /></div>
              <div className="space-y-1.5"><Label htmlFor="supervisorContact">Supervisor phone or email</Label><Input id="supervisorContact" name="supervisorContact" defaultValue={w.placement?.supervisorContact ?? ""} disabled={locked} /></div>
              <div className="space-y-1.5"><Label htmlFor="startedAt">Start date</Label><Input id="startedAt" name="startedAt" type="date" defaultValue={w.placement?.startedAt ?? ""} disabled={locked} /></div>
              {!locked && <Button type="submit" size="sm">{w.placement ? "Update placement" : "Save placement"}</Button>}
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hours: {w.hoursVerified}{w.hoursRequired > 0 ? ` / ${w.hoursRequired}` : ""} verified</CardTitle>
            <CardDescription>{w.hoursPending > 0 ? `${w.hoursPending} more hour(s) awaiting verification.` : "Log hours after each time you serve."}</CardDescription>
          </CardHeader>
          <CardContent>
            {w.hoursRequired > 0 && <ProgressBar value={w.hoursVerified} max={w.hoursRequired} className="mb-4" />}
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <Badge variant={locked ? "success" : "warning"}>{locked ? "Supervisor sign-off recorded" : "Awaiting supervisor sign-off"}</Badge>
              {p.internship?.status === "graded" && <Badge variant={p.internship.passed ? "success" : "destructive"}>Graded {p.internship.pct}%</Badge>}
            </div>
            {!w.placement ? <p className="text-sm text-gray-500">Save your placement first, then you can log hours.</p> : locked ? null : (
              <form action={logInternshipHours} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="activityDate">Date</Label><Input id="activityDate" name="activityDate" type="date" defaultValue={todayISO()} max={todayISO()} required /></div>
                  <div className="space-y-1.5"><Label htmlFor="hours">Hours</Label><Input id="hours" name="hours" type="number" step="0.5" min="0.5" max="24" required /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="description">What did you do?</Label><Textarea id="description" name="description" rows={2} /></div>
                <Button size="sm" type="submit">Log hours</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Hours log</h2>
      {logs.length === 0 ? <Empty>No hours logged yet.</Empty> : (
        <Card><CardContent className="divide-y p-0">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="w-28 text-gray-500">{formatDate(l.activityDate)}</span><span className="w-16 font-medium">{l.hours} h</span>
              <span className="min-w-0 flex-1 text-gray-600">{l.description ?? "—"}</span><StatusBadge status={l.status} />
            </div>
          ))}
        </CardContent></Card>
      )}
    </>
  );
}
