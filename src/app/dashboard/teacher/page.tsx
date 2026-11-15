import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { requirementLogs, results } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listScopedStudents } from "@/lib/queries";
import { PageHeader, StatCard } from "@/components/ui/misc";

import { Users, ClipboardList, HandHeart } from "lucide-react";

export default async function TeacherHome() {
  const user = await requireRole("TEACHER");
  const mine = await listScopedStudents(user);
  const ids = mine.map((m) => m.student.id);
  const pendingGrades = ids.length ? await db.select().from(results).where(and(inArray(results.studentId, ids), eq(results.status, "submitted"))) : [];
  const pendingLogs = ids.length ? await db.select().from(requirementLogs).where(and(inArray(requirementLogs.studentId, ids), eq(requirementLogs.status, "pending"))) : [];
  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Your cohorts at a glance." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 auto-rows-fr">
        <StatCard icon={Users} tone="brand" label="My students" value={mine.filter((m) => m.student.status === "active").length} />
        <StatCard icon={ClipboardList} tone="amber" label="Awaiting grading" value={pendingGrades.length} accent />
        <StatCard icon={HandHeart} tone="blue" label="Awaiting verification" value={pendingLogs.length} accent />
      </div>
    </>
  );
}
