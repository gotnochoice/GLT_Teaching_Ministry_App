import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendance, classSessions, cohorts, courses } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listScopedStudents } from "@/lib/queries";
import { createSession, saveAttendance } from "@/lib/actions/staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Empty, PageHeader } from "@/components/ui/misc";
import { formatDate, todayISO } from "@/lib/utils";

const sel = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm";

export default async function TeacherSessions() {
  const user = await requireRole("TEACHER", "ADMIN");
  const mine = await listScopedStudents(user);
  const allCohorts = await db.select().from(cohorts);
  const myCohorts = user.role === "ADMIN" ? allCohorts : allCohorts.filter((c) => c.teacherId === user.id);
  const cohortIds = new Set(myCohorts.map((c) => c.id));
  const allCourses = await db.select().from(courses).orderBy(courses.number);
  const sessions = (await db.select({ s: classSessions, c: courses }).from(classSessions).innerJoin(courses, eq(courses.id, classSessions.courseId)).orderBy(desc(classSessions.date))).filter((x) => cohortIds.has(x.s.cohortId));
  const att = await db.select().from(attendance);
  const attKey = new Map(att.map((a) => [`${a.sessionId}:${a.studentId}`, a.status]));

  return (
    <>
      <PageHeader title="Sessions & Attendance" description="Schedule Sunday (or online) classes and mark who attended." />
      {myCohorts.length === 0 ? <Empty>You are not assigned to a cohort yet.</Empty> : (
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-base">Schedule a session</CardTitle></CardHeader>
          <CardContent>
            <form action={createSession} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5"><Label>Cohort</Label><select name="cohortId" className={sel} required>{myCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Class</Label><select name="courseId" className={sel} required>{allCourses.map((c) => <option key={c.id} value={c.id}>Class {c.number}: {c.title}</option>)}</select></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" name="date" defaultValue={todayISO()} required /></div>
              <div className="space-y-1.5"><Label>Mode</Label><select name="mode" className={sel}><option value="in-person">In person</option><option value="online">Online</option></select></div>
              <div className="space-y-1.5"><Label>Meeting link (online)</Label><Input name="meetingLink" placeholder="https://" /></div>
              <div className="space-y-1.5"><Label>Topic (optional)</Label><Input name="topic" /></div>
              <div className="sm:col-span-2 lg:col-span-3"><Button type="submit">Add session</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {sessions.map(({ s, c }) => {
          const roster = mine.filter((m) => m.student.cohortId === s.cohortId && m.student.status === "active");
          return (
            <Card key={s.id}>
              <CardHeader><CardTitle className="text-base">{formatDate(s.date)} · Class {c.number}: {c.title} <span className="text-sm font-normal text-gray-500">({s.mode})</span></CardTitle></CardHeader>
              <CardContent>
                {roster.length === 0 ? <p className="text-sm text-gray-500">No active students in this cohort.</p> : (
                  <form action={saveAttendance} className="space-y-2">
                    <input type="hidden" name="sessionId" value={s.id} />
                    {roster.map((m) => (
                      <div key={m.student.id} className="flex items-center gap-3 text-sm">
                        <span className="w-48 truncate font-medium">{m.user.name}</span>
                        <select name={`att_${m.student.id}`} defaultValue={attKey.get(`${s.id}:${m.student.id}`) ?? "present"} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm">
                          <option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option>
                        </select>
                      </div>
                    ))}
                    <Button size="sm" type="submit" className="mt-2">Save attendance</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
