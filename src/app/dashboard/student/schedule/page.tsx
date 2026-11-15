import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendance, classSessions, courses } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader } from "@/components/ui/misc";
import { formatDate, todayISO } from "@/lib/utils";

export default async function StudentSchedule() {
  const user = await requireRole("STUDENT");
  const { student } = await getMyStudent(user.id);
  const sessions = student.cohortId
    ? await db.select({ s: classSessions, c: courses }).from(classSessions)
        .innerJoin(courses, eq(courses.id, classSessions.courseId))
        .where(eq(classSessions.cohortId, student.cohortId)).orderBy(asc(classSessions.date))
    : [];
  const att = await db.select().from(attendance).where(eq(attendance.studentId, student.id));
  const attBy = new Map(att.map((a) => [a.sessionId, a.status]));
  const today = todayISO();
  const present = att.filter((a) => a.status === "present").length;

  return (
    <>
      <PageHeader title="Schedule" description={att.length ? `Attendance: ${present} of ${att.length} recorded sessions` : "Sunday classes — in person or online."} />
      {sessions.length === 0 ? <Empty>No sessions scheduled yet.</Empty> : (
        <Card><CardContent className="divide-y p-0">
          {sessions.map(({ s, c }) => {
            const past = s.date < today;
            const a = attBy.get(s.id);
            return (
              <div key={s.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 text-sm ${past ? "text-gray-500" : ""}`}>
                <span className="w-28 font-medium">{formatDate(s.date)}</span>
                <span className="min-w-0 flex-1">Class {c.number}: {c.title}{s.topic ? ` — ${s.topic}` : ""}</span>
                <Badge variant="outline">{s.mode}</Badge>
                {!past && s.mode === "online" && s.meetingLink && <a className="font-medium text-brand hover:underline" href={s.meetingLink}>Join</a>}
                {a && <Badge variant={a === "present" ? "success" : a === "excused" ? "warning" : "destructive"}>{a}</Badge>}
              </div>
            );
          })}
        </CardContent></Card>
      )}
    </>
  );
}
