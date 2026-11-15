import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { resetRequests, students, users } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { ResetLinkForm } from "@/components/forms/reset-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export default async function AdminPasswordResets({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole("ADMIN");
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const pending = await db.select({ r: resetRequests, u: users }).from(resetRequests).innerJoin(users, eq(users.id, resetRequests.userId)).where(eq(resetRequests.status, "pending")).orderBy(desc(resetRequests.createdAt));
  const found = term
    ? await db.select({ u: users, s: students }).from(users).leftJoin(students, eq(students.userId, users.id))
        .where(or(ilike(users.name, `%${term}%`), ilike(users.email, `%${term}%`), ilike(users.phone, `%${term}%`), ilike(students.matricNo, `%${term}%`))).limit(10)
    : [];
  return (
    <>
      <PageHeader title="Password resets" description="People who asked to reset their password, and a way to make a one-time reset link for anyone. Send the link on WhatsApp; it works once." />
      <h2 className="mb-2 text-lg font-semibold">Waiting for a link ({pending.length})</h2>
      {pending.length === 0 ? <Empty>Nobody is waiting.</Empty> : (
        <div className="space-y-3">
          {pending.map(({ r, u }) => (
            <Card key={r.id}><CardContent className="space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span className="text-base font-semibold">{u.name}</span><Badge variant="outline">{u.role.toLowerCase()}</Badge><span className="text-xs text-gray-500">asked {formatDate(r.createdAt)}</span></div>
              <p className="text-gray-600">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
              <ResetLinkForm userId={u.id} />
            </CardContent></Card>
          ))}
        </div>
      )}
      <h2 className="mb-2 mt-10 text-lg font-semibold">Reset someone&apos;s password</h2>
      <form className="mb-4 flex max-w-md gap-2">
        <Input name="q" defaultValue={term} placeholder="Name, email, phone or matric number…" />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      {term && found.length === 0 && <Empty>No one matches &ldquo;{term}&rdquo;.</Empty>}
      {found.length > 0 && (
        <div className="space-y-3">
          {found.map(({ u, s }) => (
            <Card key={u.id}><CardContent className="space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span className="text-base font-semibold">{u.name}</span><Badge variant="outline">{u.role.toLowerCase()}</Badge>{s?.matricNo && <span className="font-mono text-xs text-gray-500">{s.matricNo}</span>}</div>
              <p className="text-gray-600">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
              <ResetLinkForm userId={u.id} />
            </CardContent></Card>
          ))}
        </div>
      )}
    </>
  );
}
