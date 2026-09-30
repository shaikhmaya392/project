// One-time migration: copy the old JSON-file data (leads / projects /
// quotations / users) into the libSQL/Turso database.
//
// Usage:
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate.mjs <dir>
//
// <dir> is a folder containing any of: leads.json, projects.json,
// quotations.json, users.json — each an array of records (exactly the shape
// the old Vercel Blob store held). Records are inserted with INSERT OR
// IGNORE keyed by id, so running it is safe and never overwrites data added
// after the switch. Uploaded binary files are migrated separately.

import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const dir = process.argv[2] || ".";
const url = process.env.TURSO_DATABASE_URL || "file:./data/app.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
const db = createClient({ url, authToken });

const TABLES = ["leads", "projects", "quotations", "users"];

async function ensure() {
  for (const t of TABLES) {
    await db.execute(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
}

async function migrateTable(table) {
  const file = join(dir, `${table}.json`);
  if (!existsSync(file)) {
    console.log(`skip ${table} (no ${table}.json)`);
    return;
  }
  const rows = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(rows)) {
    console.log(`skip ${table} (not an array)`);
    return;
  }
  let inserted = 0;
  for (const row of rows) {
    if (!row || !row.id) continue;
    const res = await db.execute({
      sql: `INSERT OR IGNORE INTO ${table} (id, data) VALUES (?, ?)`,
      args: [String(row.id), JSON.stringify(row)],
    });
    if (res.rowsAffected > 0) inserted++;
  }
  console.log(`${table}: ${inserted} inserted / ${rows.length} in file`);
}

await ensure();
for (const t of TABLES) await migrateTable(t);
console.log("Migration done.");
