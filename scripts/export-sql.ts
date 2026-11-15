import { mkdirSync, writeFileSync } from "fs";
import { DDL } from "./schema-sql";

mkdirSync("db", { recursive: true });
writeFileSync(
  "db/schema.sql",
  "-- GLT Life Foundation Bible School: database schema.\n-- Paste into Supabase -> SQL Editor -> Run. Safe to run again (it only adds what is missing).\n" + DDL.trimStart()
);
console.log("Wrote db/schema.sql");
