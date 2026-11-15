import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { requirementLogs } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listScopedStudents } from "@/lib/queries";
import { reviewLog } from "@/lib/actions/staff";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty, PageHeader } from "@/components/ui/misc";
import { formatDate, REQUIREMENT_LABEL } from "@/lib/utils";

export default async function TeacherRequirements() {
  const user = await requireRole("TEACHER", "ADMIN");
  const mine = await listScopedStudents(user);
  const ids = mine.map((m) => m.student.id);
  const name = new Map(mine.map((m) => [m.student.id, m.user.name]));
  const logs = ids.length ? await db.select().from(requirementLogs).where(and(inArray(requirementLogs.studentId, ids), eq(requirementLogs.status, "pending"))).orderBy(desc(requirementLogs.activityDate)) : [];
  return (
    <>
      <PageHeader title="Verify Prayer & Evangelism" description="Required for graduation, not graded. Verify entries you can confirm; reject ones you cannot." />
      {logs.length === 0 ? <Empty>No pending entries.</Empty> : (
        <Card><CardContent className="divide-y p-0">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{name.get(l.studentId)} · {REQUIREMENT_LABEL[l.kind]} · {formatDate(l.activityDate)}</p>
                <p className="text-gray-600">{l.description ?? "No details given."}</p>
              </div>
              <form action={reviewLog} className="flex gap-2">
                <input type="hidden" name="id" value={l.id} />
                <Button size="sm" name="decision" value="verified">Verify</Button>
                <Button size="sm" variant="outline" name="decision" value="rejected">Reject</Button>
              </form>
            </div>
          ))}
        </CardContent></Card>
      )}
    </>
  );
}
