import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cohorts, requirementLogs, results } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listStudents } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { PageHeader, StatCard } from "@/components/ui/misc";

import { Users, Layers, GraduationCap, ClipboardList, HandHeart } from "lucide-react";

export default async function AdminHome() {
  await requireRole("ADMIN");
  const all = await listStudents();
  const active = all.filter((s) => s.student.status === "active");
  const ready = (await Promise.all(active.map((s) => getStudentProgress(s.student.id, s.student.currentClass)))).filter((p) => p.eligibleToGraduate).length;
  const toGrade = (await db.select().from(results).where(eq(results.status, "submitted"))).length;
  const toVerify = (await db.select().from(requirementLogs).where(eq(requirementLogs.status, "pending"))).length;
  const cohortCount = (await db.select().from(cohorts).where(eq(cohorts.status, "active"))).length;
  return (
    <>
      <PageHeader title="Admin overview" description="Everything across all cohorts." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} tone="brand" label="Active students" value={active.length} sub={`${all.filter((s) => s.student.status === "graduated").length} graduated`} />
        <StatCard icon={Layers} tone="blue" label="Active cohorts" value={cohortCount} />
        <StatCard icon={GraduationCap} tone="amber" label="Ready to graduate" value={ready} accent />
        <StatCard icon={ClipboardList} tone="red" label="Awaiting grading" value={toGrade} />
        <StatCard icon={HandHeart} tone="amber" label="Awaiting verification" value={toVerify} />
      </div>
    </>
  );
}
