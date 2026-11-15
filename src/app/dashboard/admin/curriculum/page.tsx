import { db } from "@/lib/db";
import { assessments, courses } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { updateAssessment, updateCourse } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/misc";
import { classLabel } from "@/lib/utils";
import type { assessments as A } from "@/lib/schema";

function AssessmentForm({ a }: { a: typeof A.$inferSelect }) {
  return (
    <form action={updateAssessment} className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={a.id} />
      <div><label className="text-xs text-gray-500">{a.kind}</label><Input name="title" defaultValue={a.title} className="h-9" required /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-xs text-gray-500">Due date</label><Input name="dueDate" type="date" defaultValue={a.dueDate ?? ""} className="h-9" /></div>
        <div><label className="text-xs text-gray-500">Max score</label><Input name="maxScore" type="number" min={1} defaultValue={a.maxScore} className="h-9" required /></div>
      </div>
      <div className="sm:col-span-2"><label className="text-xs text-gray-500">Instructions / questions</label><Textarea name="instructions" rows={2} defaultValue={a.instructions ?? ""} /></div>
      <div className="sm:col-span-2"><Button size="sm" type="submit">Save</Button></div>
    </form>
  );
}

export default async function AdminCurriculum() {
  await requireRole("ADMIN");
  const cs = await db.select().from(courses).orderBy(courses.number);
  const as = await db.select().from(assessments).orderBy(assessments.kind);
  const programme = as.filter((a) => !a.courseId);
  return (
    <>
      <PageHeader title="Curriculum & Tests" description="Rename classes and edit each class's test and assignment. Instructions you write here are shown to students." />
      <div className="space-y-6">
        {cs.map((c) => (
          <Card key={c.id}>
            <CardHeader><CardTitle className="text-base">{classLabel(c)} <span className="text-sm font-normal text-gray-400">· class {c.number} of 9</span></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form action={updateCourse} className="grid gap-2 sm:grid-cols-[8rem_1fr_2fr_auto]">
                <input type="hidden" name="id" value={c.id} />
                <Input name="code" defaultValue={c.code ?? ""} placeholder="Code, e.g. MMC 101" maxLength={20} aria-label="Class code" /><Input name="title" defaultValue={c.title} required aria-label="Class title" /><Input name="description" defaultValue={c.description ?? ""} placeholder="Short description" />
                <Button size="sm" type="submit">Save class</Button>
              </form>
              {as.filter((a) => a.courseId === c.id).map((a) => <AssessmentForm key={a.id} a={a} />)}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader><CardTitle className="text-base">Programme assessments (exam & internship)</CardTitle></CardHeader>
          <CardContent className="space-y-3">{programme.map((a) => <AssessmentForm key={a.id} a={a} />)}</CardContent>
        </Card>
      </div>
    </>
  );
}
