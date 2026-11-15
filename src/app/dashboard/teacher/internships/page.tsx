import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { internshipLogs } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listScopedStudents } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { reviewInternshipHours, signOffInternship } from "@/lib/actions/staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader, ProgressBar } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export default async function TeacherInternships() {
  const user = await requireRole("TEACHER", "ADMIN");
  const mine = (await listScopedStudents(user)).filter((m) => m.student.status === "active");
  const ids = mine.map((m) => m.student.id);
  const logs = ids.length ? await db.select().from(internshipLogs).where(inArray(internshipLogs.studentId, ids)).orderBy(desc(internshipLogs.activityDate)) : [];
  const items = await Promise.all(mine.map(async (m) => ({ m, p: await getStudentProgress(m.student.id, m.student.currentClass) })));
  const withPlacement = items.filter((i) => i.p.internshipWork.placement);
  return (
    <>
      <PageHeader title="Internships" description="Verify served hours, record each supervisor's sign-off, then grade the internship on the Grading page." />
      {withPlacement.length === 0 ? <Empty>No students have registered an internship placement yet.</Empty> : (
        <div className="space-y-4">
          {withPlacement.map(({ m, p }) => {
            const w = p.internshipWork;
            const pending = logs.filter((l) => l.studentId === m.student.id && l.status === "pending");
            return (
              <Card key={m.student.id}>
                <CardHeader>
                  <CardTitle className="text-base">{m.user.name} — {w.placement!.ministryUnit}</CardTitle>
                  <p className="text-sm text-gray-500">Supervisor: {w.placement!.supervisorName}{w.placement!.supervisorContact ? ` (${w.placement!.supervisorContact})` : ""}</p>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div><div className="mb-1 flex justify-between"><span>Verified hours</span><span>{w.hoursVerified}{w.hoursRequired > 0 ? ` / ${w.hoursRequired}` : ""}</span></div>{w.hoursRequired > 0 && <ProgressBar value={w.hoursVerified} max={w.hoursRequired} />}</div>
                  {pending.length > 0 && (
                    <div className="divide-y rounded-md border">
                      {pending.map((l) => (
                        <div key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                          <span className="w-28 text-gray-500">{formatDate(l.activityDate)}</span><span className="w-14 font-medium">{l.hours} h</span><span className="min-w-0 flex-1 text-gray-600">{l.description ?? "—"}</span>
                          <form action={reviewInternshipHours} className="flex gap-2"><input type="hidden" name="id" value={l.id} /><Button size="sm" name="decision" value="verified">Verify</Button><Button size="sm" variant="outline" name="decision" value="rejected">Reject</Button></form>
                        </div>
                      ))}
                    </div>
                  )}
                  {w.placement!.signedOff ? (
                    <p><Badge variant="success">Supervisor signed off</Badge>{w.placement!.supervisorRemarks ? ` “${w.placement!.supervisorRemarks}”` : ""}</p>
                  ) : (
                    <form action={signOffInternship} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="studentId" value={m.student.id} />
                      <div className="min-w-56 flex-1"><label className="text-xs text-gray-500">Supervisor&apos;s remarks (confirm you have their sign-off)</label><Input name="remarks" className="h-9" /></div>
                      <Button size="sm" type="submit">Record supervisor sign-off</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
