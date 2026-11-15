import { requireRole } from "@/lib/session";
import { listStudents } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { graduateStudent } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty, PageHeader, StatusBadge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export default async function AdminGraduation() {
  await requireRole("ADMIN");
  const rows = await listStudents();
  const items = await Promise.all(rows.filter((r) => r.student.status !== "withdrawn").map(async (r) => ({ ...r, p: await getStudentProgress(r.student.id, r.student.currentClass) })));
  const ready = items.filter((i) => i.student.status !== "graduated" && i.p.eligibleToGraduate);
  const rest = items.filter((i) => i.student.status !== "graduated" && !i.p.eligibleToGraduate);
  const done = items.filter((i) => i.student.status === "graduated");
  return (
    <>
      <PageHeader title="Graduation" description="A student graduates only when all 9 classes, the exam and internship are passed and the required prayers and evangelism are verified." />
      <h2 className="mb-2 text-lg font-semibold">Ready to graduate ({ready.length})</h2>
      {ready.length === 0 ? <Empty>No one is eligible yet.</Empty> : (
        <Card className="mb-8"><CardContent className="divide-y p-0">
          {ready.map(({ student, user, p }) => (
            <div key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="flex-1 font-medium">{user.name}</span><span className="text-gray-500">Overall {p.overall}%</span>
              <form action={graduateStudent}><input type="hidden" name="id" value={student.id} /><Button size="sm" variant="orange" type="submit">Graduate</Button></form>
            </div>
          ))}
        </CardContent></Card>
      )}
      <h2 className="mb-2 text-lg font-semibold">Still in progress ({rest.length})</h2>
      <Card className="mb-8"><CardContent className="divide-y p-0">
        {rest.map(({ student, user, p }) => (
          <div key={student.id} className="px-5 py-3 text-sm"><div className="flex items-center gap-3"><span className="flex-1 font-medium">{user.name}</span><StatusBadge status={student.status} /></div><p className="mt-1 text-xs text-gray-500">Missing: {p.missing.join(" · ")}</p></div>
        ))}
        {rest.length === 0 && <p className="px-5 py-4 text-sm text-gray-500">None.</p>}
      </CardContent></Card>
      <h2 className="mb-2 text-lg font-semibold">Alumni ({done.length})</h2>
      <Card><CardContent className="divide-y p-0">
        {done.map(({ student, user, p }) => (<div key={student.id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="flex-1 font-medium">{user.name}</span><span className="text-gray-500">{p.overall}% · {formatDate(student.graduatedAt)}</span></div>))}
        {done.length === 0 && <p className="px-5 py-4 text-sm text-gray-500">No graduates yet.</p>}
      </CardContent></Card>
    </>
  );
}
