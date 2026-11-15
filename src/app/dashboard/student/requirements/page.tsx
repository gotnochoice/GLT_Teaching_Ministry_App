import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requirementLogs } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { getRules } from "@/lib/progress";
import { logRequirement } from "@/lib/actions/student";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, PageHeader, ProgressBar, StatusBadge } from "@/components/ui/misc";
import { formatDate, REQUIREMENT_LABEL, todayISO } from "@/lib/utils";

export default async function StudentRequirements() {
  const user = await requireRole("STUDENT");
  const { student } = await getMyStudent(user.id);
  const rules = await getRules();
  const logs = await db.select().from(requirementLogs).where(eq(requirementLogs.studentId, student.id)).orderBy(desc(requirementLogs.activityDate));

  return (
    <>
      <PageHeader title="Prayer & Evangelism" description="Required for graduation but not graded. A teacher verifies each entry." />
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {(["PRAYER", "EVANGELISM"] as const).map((kind) => {
          const required = kind === "PRAYER" ? rules.prayersRequired : rules.evangelismRequired;
          const verified = logs.filter((l) => l.kind === kind && l.status === "verified").length;
          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle className="text-base">{REQUIREMENT_LABEL[kind]}: {verified}/{required} verified</CardTitle>
                <CardDescription>Log each one after you complete it.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressBar value={verified} max={required} className="mb-4" />
                <form action={logRequirement} className="space-y-3">
                  <input type="hidden" name="kind" value={kind} />
                  <div className="space-y-1.5"><Label htmlFor={`d-${kind}`}>Date</Label><Input id={`d-${kind}`} type="date" name="activityDate" defaultValue={todayISO()} max={todayISO()} required /></div>
                  <div className="space-y-1.5"><Label htmlFor={`n-${kind}`}>What happened?</Label><Textarea id={`n-${kind}`} name="description" rows={2} placeholder={kind === "PRAYER" ? "Who/what did you pray for, and with whom?" : "Where did you share, and what was the outcome?"} /></div>
                  <Button type="submit" size="sm">Log {REQUIREMENT_LABEL[kind].toLowerCase()}</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <h2 className="mb-3 text-lg font-semibold">History</h2>
      {logs.length === 0 ? <Empty>No entries yet.</Empty> : (
        <Card><CardContent className="divide-y p-0">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="w-24 font-medium">{REQUIREMENT_LABEL[l.kind]}</span>
              <span className="w-28 text-gray-500">{formatDate(l.activityDate)}</span>
              <span className="min-w-0 flex-1 text-gray-600">{l.description ?? "—"}</span>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </CardContent></Card>
      )}
    </>
  );
}
