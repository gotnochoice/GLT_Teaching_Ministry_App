import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendance, classSessions, courses } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { requestMakeup } from "@/lib/actions/student";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader, ProgressBar, StatCard } from "@/components/ui/misc";
import { formatDate, todayISO } from "@/lib/utils";

const LABEL: Record<string, { text: string; v: "success" | "warning" | "destructive" | "outline" }> = {
  present: { text: "Present", v: "success" },
  makeup: { text: "Made up", v: "success" },
  makeup_pending: { text: "Make-up awaiting approval", v: "warning" },
  excused: { text: "Excused", v: "outline" },
  absent: { text: "Absent", v: "destructive" },
};

import { CalendarCheck } from "lucide-react";

export default async function StudentSchedule() {
  const user = await requireRole("STUDENT");
  const { student } = await getMyStudent(user.id);
  const p = await getStudentProgress(student.id, student.currentClass);
  const sessions = student.cohortId
    ? await db.select({ s: classSessions, c: courses }).from(classSessions).innerJoin(courses, eq(courses.id, classSessions.courseId)).where(eq(classSessions.cohortId, student.cohortId)).orderBy(asc(classSessions.date))
    : [];
  const rows = sessions.length ? await db.select().from(attendance).where(inArray(attendance.sessionId, sessions.map((x) => x.s.id))) : [];
  const recorded = new Set(rows.map((r) => r.sessionId));
  const mine = new Map(rows.filter((r) => r.studentId === student.id).map((r) => [r.sessionId, r.status]));
  const today = todayISO();
  const a = p.attendance;
  const meets = a.required === 0 || (a.pct !== null && a.pct >= a.required);

  return (
    <>
      <PageHeader title="Schedule & attendance" description="Sunday classes, in person or online. If you miss one, watch the recording and request a make-up." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard icon={CalendarCheck} tone="brand" label="Attendance" value={a.pct === null ? "—" : `${a.pct}%`} sub={a.total ? `${a.attended} of ${a.total} recorded sessions` : "No sessions recorded yet"} accent={!meets} />
        <Card><CardContent className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Required to graduate</p>
          <p className="mt-1 text-3xl font-bold text-brand">{a.required > 0 ? `${a.required}%` : "None"}</p>
          {a.required > 0 && a.pct !== null && <ProgressBar className="mt-3" value={a.pct} max={100} />}
          {a.required > 0 && !meets && a.pct !== null && <p className="mt-2 text-xs text-gray-500">Make up missed classes from the recordings below to raise this.</p>}
        </CardContent></Card>
      </div>
      {sessions.length === 0 ? <Empty>No sessions scheduled yet.</Empty> : (
        <Card><CardContent className="divide-y p-0">
          {sessions.map(({ s, c }) => {
            const past = s.date < today;
            const beforeJoining = !!student.enrolledAt && s.date < student.enrolledAt;
            const st = beforeJoining ? undefined : (mine.get(s.id) ?? (past && recorded.has(s.id) ? "absent" : undefined));
            const canMakeup = past && st === "absent" && !!s.recordingUrl;
            return (
              <div key={s.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 text-sm ${past ? "text-gray-600" : ""}`}>
                <span className="w-28 font-medium">{formatDate(s.date)}</span>
                <span className="min-w-0 flex-1">Class {c.number}: {c.title}{s.topic ? ` — ${s.topic}` : ""}</span>
                <Badge variant="outline">{s.mode}</Badge>
                {!past && s.mode === "online" && s.meetingLink && <a className="font-medium text-brand hover:underline" href={s.meetingLink}>Join</a>}
                {s.recordingUrl && <a className="font-medium text-brand hover:underline" href={s.recordingUrl} target="_blank" rel="noreferrer">Recording</a>}
                {st && <Badge variant={LABEL[st]?.v ?? "outline"}>{LABEL[st]?.text ?? st}</Badge>}
                {canMakeup && <form action={requestMakeup}><input type="hidden" name="sessionId" value={s.id} /><Button size="sm" variant="outline" type="submit">I watched it — request make-up</Button></form>}
                {beforeJoining && s.recordingUrl == null && <span className="text-xs text-gray-400">Before you joined</span>}
                {past && st === "absent" && !s.recordingUrl && <span className="text-xs text-gray-400">No recording yet</span>}
              </div>
            );
          })}
        </CardContent></Card>
      )}
    </>
  );
}
