import { requireRole } from "@/lib/session";
import { listScopedStudents } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, PageHeader, ProgressBar, StatusBadge } from "@/components/ui/misc";
import { WaLink } from "@/components/ui/wa-link";

export default async function TeacherStudents() {
  const user = await requireRole("TEACHER");
  const rows = await listScopedStudents(user);
  const withProgress = await Promise.all(rows.map(async (r) => ({ ...r, p: await getStudentProgress(r.student.id, r.student.currentClass) })));
  return (
    <>
      <PageHeader title="Students" description="Students in cohorts you lead." />
      {withProgress.length === 0 ? <Empty>No students are assigned to your cohorts yet. Ask an admin to assign you to a cohort.</Empty> : (
        <Card><CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Cohort</th><th className="px-4 py-3">Class</th><th className="px-4 py-3 w-40">Progress</th><th className="px-4 py-3">Prayer</th><th className="px-4 py-3">Evang.</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Contact</th></tr></thead>
            <tbody className="divide-y">
              {withProgress.map(({ student, user: u, cohort, p }) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3 text-gray-500">{cohort?.name ?? "—"}</td>
                  <td className="px-4 py-3">{student.currentClass}/9</td><td className="px-4 py-3"><ProgressBar value={p.classesCompleted} max={9} /></td>
                  <td className="px-4 py-3">{p.prayers.verified}/{p.prayers.required}</td><td className="px-4 py-3">{p.evangelism.verified}/{p.evangelism.required}</td>
                  <td className="px-4 py-3">{p.overall === null ? "—" : `${p.overall}%`}</td><td className="px-4 py-3"><StatusBadge status={student.status} /></td><td className="px-4 py-3"><WaLink phone={u.phone} text={`Hello ${u.name.split(" ")[0]}, `} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </>
  );
}
