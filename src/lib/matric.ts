import { sql } from "drizzle-orm";
import { db } from "./db";

/** Year+month (YYMM) in Lagos time, e.g. November 2026 -> "2611". */
export function matricPeriod(d: Date = new Date()): string {
  const iso = d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // YYYY-MM-DD
  return iso.slice(2, 4) + iso.slice(5, 7);
}

/**
 * Next matric number: GLTIFE/YYMM/NNN. The counter is incremented by a single atomic upsert, so two
 * students enrolled at the same moment can never receive the same number. The sequence restarts at 001
 * each month. (The unique index on students.matric_no is a second safety net.)
 */
export async function nextMatricNo(d: Date = new Date()): Promise<string> {
  const period = matricPeriod(d);
  const res = await db.execute(sql`
    INSERT INTO matric_counters AS c (period, last) VALUES (${period}, 1)
    ON CONFLICT (period) DO UPDATE SET last = c.last + 1
    RETURNING c.last AS last`);
  const n = Number((res.rows[0] as { last: number | string }).last);
  return `GLTIFE/${period}/${String(n).padStart(3, "0")}`;
}
