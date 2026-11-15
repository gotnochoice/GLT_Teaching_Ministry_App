import { Pool } from "pg";

import { DDL } from "./schema-sql";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  await pool.query(DDL);
  await pool.end();
  console.log("Database tables ready.");
}
main().catch((e) => { console.error(e); process.exit(1); });
