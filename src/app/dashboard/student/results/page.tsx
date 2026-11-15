import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/misc";

import { Trophy, CheckCircle2, GraduationCap } from "lucide-react";

export default async function StudentResults() {
  const user = await requireRole("STUDENT");
  const { student } = await getMyStudent(user.id);
  const p = await getStudentProgress(student.id, student.currentClass);
  const rows = [
    ...p.classes.flatMap((c) => [c.test, c.assignment].filter((x) => !!x).map((x) => ({ group: c.label, ...x! }))),
    ...[p.exam, p.internship].filter((x) => !!x).map((x) => ({ group: "Programme", ...x! })),
  ];
  return (
    <>
      <PageHeader title="Results" description={`Weighted: classwork ${p.rules.weightClasswork}% · exam ${p.rules.weightExam}% · internship ${p.rules.weightInternship}%. Pass mark ${p.rules.passMark}%.`} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 auto-rows-fr">
        <StatCard icon={Trophy} tone="amber" label="Overall grade" value={p.overall === null ? "—" : `${p.overall}%`} accent />
        <StatCard icon={CheckCircle2} tone="brand" label="Classes passed" value={`${p.classesCompleted}/9`} />
        <StatCard icon={GraduationCap} tone="blue" label="Graduation" value={p.eligibleToGraduate ? "Eligible" : "In progress"} sub={p.missing[0]} />
      </div>
      <div className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <div key={r.assessmentId} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5">
            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-900">{r.title}</p><p className="text-xs text-gray-500">{r.group}</p></div>
            <div className="shrink-0 text-right">
              {r.status === "graded"
                ? <><p className={r.passed ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-600"}>{r.score}/{r.maxScore}</p><p className="text-xs text-gray-500">{r.pct}%</p></>
                : <StatusBadge status={r.status} />}
            </div>
          </div>
        ))}
      </div>
      <Card className="hidden sm:block"><CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">For</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Score</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.assessmentId}>
                <td className="px-4 py-3 text-gray-500">{r.group}</td><td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">{r.status === "graded" ? <span className={r.passed ? "font-semibold text-green-700" : "font-semibold text-red-600"}>{r.score}/{r.maxScore} ({r.pct}%)</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
