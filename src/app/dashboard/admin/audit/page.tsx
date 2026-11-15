import { desc, ilike, or, eq, and, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, PageHeader } from "@/components/ui/misc";

const ENTITIES = ["result", "student", "attendance", "class_session", "requirement_log", "internship", "internship_log", "application", "user", "settings", "assessment", "course", "cohort", "care_request", "announcement"];

function describe(detail: string | null) {
  if (!detail) return "";
  try {
    const d = JSON.parse(detail) as Record<string, unknown>;
    return Object.entries(d).map(([k, v]) => `${k}: ${typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`).join(" · ");
  } catch { return detail; }
}

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ q?: string; entity?: string }> }) {
  await requireRole("ADMIN");
  const { q, entity } = await searchParams;
  const conds: SQL[] = [];
  if (entity && ENTITIES.includes(entity)) conds.push(eq(auditLog.entity, entity));
  if (q) conds.push(or(ilike(auditLog.action, `%${q}%`), ilike(auditLog.actorName, `%${q}%`), ilike(auditLog.detail, `%${q}%`))!);
  const rows = await db.select().from(auditLog).where(conds.length ? and(...conds) : undefined).orderBy(desc(auditLog.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when. Entries cannot be edited or deleted (enforced by the database). Grade changes show the old and new score." />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search person, action or student…" className="max-w-xs" />
        <select name="entity" defaultValue={entity ?? ""} className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm"><option value="">All types</option>{ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}</select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      {rows.length === 0 ? <Empty>No matching entries.</Empty> : (
        <Card><CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">When (UTC)</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th></tr></thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{r.createdAt?.slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-3 font-medium">{r.actorName}</td>
                  <td className="px-4 py-3"><code className="text-xs">{r.action}</code></td>
                  <td className="px-4 py-3 text-gray-600">{describe(r.detail)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
      <p className="mt-3 text-xs text-gray-400">Showing the latest 300 entries.</p>
    </>
  );
}
