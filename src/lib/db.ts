import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
const globalForDb = globalThis as unknown as { _db: DrizzleDb | undefined };

function getDb(): DrizzleDb {
  if (globalForDb._db) return globalForDb._db;
  const url = process.env.DATABASE_URL;
  const local = !url || /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 5,
  });
  globalForDb._db = drizzle(pool, { schema });
  return globalForDb._db;
}

// Lazy proxy so importing this file never connects at build time.
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
