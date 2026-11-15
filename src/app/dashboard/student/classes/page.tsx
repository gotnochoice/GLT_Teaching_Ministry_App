import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { submitAssessment } from "@/lib/actions/student";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusBadge } from "@/components/ui/misc";
import { ASSESSMENT_LABEL, formatDate } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { StudentProgress } from "@/lib/progress";

type Item = NonNullable<StudentProgress["exam"]>;

function AssessmentBlock({ item, canSubmit }: { item: Item; canSubmit: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium">{item.title}</span>
        <Badge variant="outline">{ASSESSMENT_LABEL[item.kind]}</Badge>
        <StatusBadge status={item.status} />
        {item.status === "graded" && (
          <span className={item.passed ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-600"}>
            {item.score}/{item.maxScore} ({item.pct}%){item.passed ? "" : " — below pass mark"}
          </span>
        )}
      </div>
      {item.instructions && <p className="mb-2 text-sm text-gray-600">{item.instructions}</p>}
      {item.dueDate && <p className="mb-2 text-xs text-gray-500">Due {formatDate(item.dueDate)}</p>}
      {item.feedback && <p className="mb-2 rounded bg-gray-50 p-2 text-sm"><b>Feedback:</b> {item.feedback}</p>}
      {canSubmit && item.status !== "graded" && (
        <form action={submitAssessment} className="space-y-2">
          <input type="hidden" name="assessmentId" value={item.assessmentId} />
          <Textarea name="submissionText" required rows={3} defaultValue={item.submissionText ?? ""} placeholder="Type your answers / submission here" />
          <Button size="sm" type="submit">{item.status === "submitted" ? "Update submission" : "Submit"}</Button>
        </form>
      )}
    </div>
  );
}

export default async function StudentClasses() {
  const user = await requireRole("STUDENT");
  const { student } = await getMyStudent(user.id);
  const p = await getStudentProgress(student.id, student.currentClass);
  const readOnly = student.status !== "active";

  return (
    <>
      <PageHeader title="My Classes" description="Complete each class's test and assignment (pass mark applies) to unlock the next class." />
      <div className="space-y-4">
        {p.classes.map((c) => (
          <Card key={c.courseId} className={c.unlocked ? "" : "opacity-60"}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Class {c.number}: {c.title}</CardTitle>
                {c.complete && <Badge variant="success">Passed</Badge>}
                {!c.unlocked && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}
              </div>
              {c.description && <CardDescription>{c.description}</CardDescription>}
            </CardHeader>
            {c.unlocked && (
              <CardContent className="grid gap-3 md:grid-cols-2">
                {c.test && <AssessmentBlock item={c.test} canSubmit={!readOnly} />}
                {c.assignment && <AssessmentBlock item={c.assignment} canSubmit={!readOnly} />}
              </CardContent>
            )}
          </Card>
        ))}
        {p.exam && (
          <Card>
            <CardHeader><CardTitle className="text-base">Final Exam</CardTitle><CardDescription>Opens after Class 9.</CardDescription></CardHeader>
            <CardContent><AssessmentBlock item={p.exam} canSubmit={!readOnly && student.currentClass >= 9 && p.classes[8]?.complete} /></CardContent>
          </Card>
        )}
        {p.internship && (
          <Card>
            <CardHeader><CardTitle className="text-base">Internship</CardTitle><CardDescription>Graded by your teacher/supervisor.</CardDescription></CardHeader>
            <CardContent><AssessmentBlock item={p.internship} canSubmit={false} /></CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
