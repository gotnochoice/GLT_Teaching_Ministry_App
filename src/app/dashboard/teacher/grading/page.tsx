import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, courses, results } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listScopedStudents } from "@/lib/queries";
import { getRules, getStudentProgress } from "@/lib/progress";
import { allowRetake } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { GradeForm } from "@/components/staff/grade-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, PageHeader } from "@/components/ui/misc";
import { classLabel, formatDate } from "@/lib/utils";

export default async function TeacherGrading() {
  const user = await requireRole("TEACHER", "ADMIN");
  const mine = await listScopedStudents(user);
  const ids = mine.map((m) => m.student.id);
  const byId = new Map(mine.map((m) => [m.student.id, m]));
  const queue = ids.length
    ? await db.select({ r: results, a: assessments, c: courses }).from(results)
        .innerJoin(assessments, eq(assessments.id, results.assessmentId))
        .leftJoin(courses, eq(courses.id, assessments.courseId))
        .where(and(inArray(results.studentId, ids), eq(results.status, "submitted")))
    : [];
  const rules = await getRules();
  const failed = ids.length
    ? (await db.select({ r: results, a: assessments }).from(results)
        .innerJoin(assessments, eq(assessments.id, results.assessmentId))
        .where(and(inArray(results.studentId, ids), eq(results.status, "graded"))))
        .filter(({ r, a }) => a.kind !== "INTERNSHIP" && r.score !== null && (r.score / a.maxScore) * 100 < rules.passMark)
    : [];
  const [internship] = await db.select().from(assessments).where(eq(assessments.kind, "INTERNSHIP"));
  const active = mine.filter((m) => m.student.status === "active");
  const intern = internship
    ? await Promise.all(active.map(async (m) => ({ m, p: await getStudentProgress(m.student.id, m.student.currentClass) })))
    : [];

  return (
    <>
      <PageHeader title="Grading" description="Submitted tests and assignments waiting for a score." />
      {queue.length === 0 ? <Empty>Nothing to grade right now.</Empty> : (
        <div className="space-y-4">
          {queue.map(({ r, a, c }) => (
            <Card key={r.id}>
              <CardHeader><CardTitle className="text-base">{byId.get(r.studentId)?.user.name} — {a.title}{c ? ` (${classLabel(c)})` : ""}</CardTitle><p className="text-xs text-gray-500">Submitted {formatDate(r.submittedAt)}</p></CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm">{r.submissionText ?? "(no text)"}</p>
                <GradeForm assessmentId={a.id} studentId={r.studentId} max={a.maxScore} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {failed.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">Below pass mark ({rules.passMark}%)</h2>
          <Card><CardContent className="divide-y p-0">
            {failed.map(({ r, a }) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1"><b>{byId.get(r.studentId)?.user.name}</b> · {a.title} · {r.score}/{a.maxScore}</span>
                <form action={allowRetake}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="outline" type="submit">Allow retake</Button></form>
              </div>
            ))}
          </CardContent></Card>
        </>
      )}
      {internship && intern.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">Internship assessment</h2>
          <Card><CardContent className="divide-y p-0">
            {intern.map(({ m, p }) => (
              <div key={m.student.id} className="space-y-2 px-5 py-4">
                <p className="text-sm font-medium">{m.user.name} <span className="font-normal text-gray-500">{p.internship?.status === "graded" ? `· graded ${p.internship.pct}%` : "· not graded"}</span></p>
                <GradeForm assessmentId={internship.id} studentId={m.student.id} max={internship.maxScore} defaultScore={p.internship?.score} defaultFeedback={p.internship?.feedback} />
              </div>
            ))}
          </CardContent></Card>
        </>
      )}
      <ExamNote />
    </>
  );
}

function ExamNote() {
  return <p className="mt-8 text-xs text-gray-400">Exam submissions appear in the queue above once a student has passed all nine classes.</p>;
}
