import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { createUser } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";

export default async function AdminPeople() {
  await requireRole("ADMIN");
  const staff = await db.select().from(users).where(inArray(users.role, ["TEACHER", "ADMIN"])).orderBy(users.role, users.name);
  return (
    <>
      <PageHeader title="Teachers & Admins" />
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">Add a teacher or admin</CardTitle></CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5"><Label>Full name</Label><Input name="name" required /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" required /></div>
            <div className="space-y-1.5"><Label>Phone (optional)</Label><Input name="phone" /></div>
            <div className="space-y-1.5"><Label>Temporary password (min 8)</Label><Input name="password" minLength={8} required /></div>
            <div className="space-y-1.5"><Label>Role</Label><select name="role" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></select></div>
            <div className="flex items-end"><Button type="submit">Add</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card><CardContent className="divide-y p-0">
        {staff.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span className="flex-1 font-medium">{u.name}</span><span className="text-gray-500">{u.email}</span>
            <Badge variant={u.role === "ADMIN" ? "orange" : "default"}>{u.role.toLowerCase()}</Badge>
          </div>
        ))}
      </CardContent></Card>
    </>
  );
}
