import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { careRequests, users } from "@/lib/schema";
import { requirePastor } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export default async function CareInbox() {
  await requirePastor();
  const rows = await db.select({ r: careRequests, u: users }).from(careRequests).innerJoin(users, eq(users.id, careRequests.requesterId)).orderBy(desc(careRequests.createdAt));
  const open = rows.filter((x) => x.r.status !== "closed");
  const closed = rows.filter((x) => x.r.status === "closed");
  const list = (items: typeof rows) => (
    <Card><CardContent className="divide-y p-0">
      {items.map(({ r, u }) => (
        <Link key={r.id} href={`/dashboard/care/${r.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-gray-50">
          <span className="flex-1 font-medium">{r.subject}</span><span className="text-gray-500">{u.name}</span>
          <Badge variant="outline">{r.kind.toLowerCase()}</Badge><Badge variant={r.status === "open" ? "warning" : r.status === "closed" ? "success" : "default"}>{r.status.replace("_", " ")}</Badge>
          <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
        </Link>
      ))}
    </CardContent></Card>
  );
  return (
    <>
      <PageHeader title="Pastoral care inbox" description="Private requests from students. Visible only to pastors. Opening a request is recorded in the audit log." />
      <h2 className="mb-2 text-lg font-semibold">Open ({open.length})</h2>
      {open.length === 0 ? <Empty>Nothing waiting.</Empty> : list(open)}
      {closed.length > 0 && (<><h2 className="mb-2 mt-8 text-lg font-semibold">Closed ({closed.length})</h2>{list(closed)}</>)}
    </>
  );
}
