import { db } from "@/lib/db";
import { cohorts } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { listStudents } from "@/lib/queries";
import { createUser, updateStudent } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatusBadge } from "@/components/ui/misc";

const sel = "h-9 rounded-md border border-gray-300 bg-white px-2 text-sm";

export default async function AdminStudents() {
  await requireRole("ADMIN");
  const rows = await listStudents();
  const allCohorts = await db.select().from(cohorts);
  return (
    <>
      <PageHeader title="Students" description="Enrol students and manage their class, cohort and status. Graduated students are handled on the Graduation page." />
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">Enrol a student</CardTitle></CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="role" value="STUDENT" />
            <div className="space-y-1.5"><Label>Full name</Label><Input name="name" required /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" required /></div>
            <div className="space-y-1.5"><Label>Phone (optional)</Label><Input name="phone" /></div>
            <div className="space-y-1.5"><Label>Temporary password (min 8)</Label><Input name="password" minLength={8} required /></div>
            <div className="space-y-1.5"><Label>Cohort</Label><select name="cohortId" className={`${sel} w-full h-10`}><option value="">— none —</option>{allCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="flex items-end"><Button type="submit">Enrol student</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card><CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Edit</th></tr></thead>
          <tbody className="divide-y">
            {rows.map(({ student, user, cohort }) => (
              <tr key={student.id}>
                <td className="px-4 py-3"><p className="font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></td>
                <td className="px-4 py-3"><StatusBadge status={student.status} /></td>
                <td className="px-4 py-3">
                  {student.status === "graduated" ? <span className="text-gray-400">Graduated</span> : (
                    <form action={updateStudent} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={student.id} />
                      <select name="cohortId" defaultValue={cohort?.id ?? ""} className={sel}><option value="">No cohort</option>{allCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <select name="currentClass" defaultValue={student.currentClass} className={sel}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>Class {i + 1}</option>)}</select>
                      <select name="status" defaultValue={student.status} className={sel}><option value="active">Active</option><option value="paused">Paused</option><option value="withdrawn">Withdrawn</option></select>
                      <Button size="sm" type="submit">Save</Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
