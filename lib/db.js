import { createClient } from "@libsql/client";
import { hashPassword } from "./auth";

// Data lives in a hosted libSQL/SQLite database (Turso in production).
// Locally, with no env set, it falls back to a file on disk so dev and the
// test scripts work without any cloud account. On Vercel the two env vars
// below are always set, so it talks to Turso over the network.
//
// Why this exists: the app used to keep each collection as one big JSON file
// in Vercel Blob, rewriting the whole file on every change. That metered
// every read/write against a tiny free quota (which got the store
// suspended) and let concurrent writes clobber each other. Here every record
// is its own row keyed by a primary key, so writes are cheap, independent
// and atomic — no quota wall, no whole-file races.

let _client = null;
function client() {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || "file:./data/app.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  _client = createClient({ url, authToken });
  return _client;
}

const TABLES = ["leads", "projects", "quotations", "users", "files"];

let _ready = null;
// Runs once per server instance: makes sure the tables exist and a first
// admin account is present, so a brand-new database is immediately usable.
export function ready() {
  if (_ready) return _ready;
  _ready = (async () => {
    const db = client();
    for (const t of TABLES) {
      if (t === "files") {
        await db.execute(
          `CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            owner_type TEXT,
            owner_id TEXT,
            name TEXT,
            original_name TEXT,
            content_type TEXT,
            size INTEGER,
            data BLOB,
            uploaded_by TEXT,
            uploaded_at TEXT
          )`
        );
      } else {
        await db.execute(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
      }
    }
    await seedAdmin(db);
  })();
  return _ready;
}

async function seedAdmin(db) {
  const res = await db.execute("SELECT COUNT(*) AS n FROM users");
  const count = Number(res.rows[0].n) || 0;
  if (count > 0) return;
  const email = process.env.SEED_ADMIN_EMAIL || "admin@dspermitting.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "changeme123";
  const user = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "Admin",
    email,
    phone: "",
    address: "",
    password: hashPassword(password),
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  await db.execute({ sql: "INSERT INTO users (id, data) VALUES (?, ?)", args: [user.id, JSON.stringify(user)] });
}

// ---- Generic document helpers (each row is { id, data:<json> }) ----

function parse(row) {
  return JSON.parse(row.data);
}

export async function allDocs(table, orderPath, dir = "DESC") {
  await ready();
  const order = orderPath ? ` ORDER BY json_extract(data, '$.${orderPath}') ${dir}` : "";
  const res = await client().execute(`SELECT data FROM ${table}${order}`);
  return res.rows.map(parse);
}

export async function getDoc(table, id) {
  await ready();
  const res = await client().execute({ sql: `SELECT data FROM ${table} WHERE id = ?`, args: [String(id)] });
  return res.rows.length ? parse(res.rows[0]) : null;
}

export async function findDoc(table, jsonPath, value, { caseInsensitive = false } = {}) {
  await ready();
  const expr = caseInsensitive ? `lower(json_extract(data, '$.${jsonPath}'))` : `json_extract(data, '$.${jsonPath}')`;
  const arg = caseInsensitive ? String(value).toLowerCase() : value;
  const res = await client().execute({ sql: `SELECT data FROM ${table} WHERE ${expr} = ? LIMIT 1`, args: [arg] });
  return res.rows.length ? parse(res.rows[0]) : null;
}

export async function insertDoc(table, obj) {
  await ready();
  await client().execute({ sql: `INSERT INTO ${table} (id, data) VALUES (?, ?)`, args: [String(obj.id), JSON.stringify(obj)] });
  return obj;
}

// Atomic per-row update: nothing else's row is touched, so concurrent writes
// to different records never interfere.
export async function replaceDoc(table, obj) {
  await ready();
  await client().execute({
    sql: `INSERT INTO ${table} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    args: [String(obj.id), JSON.stringify(obj)],
  });
  return obj;
}

export async function deleteDoc(table, id) {
  await ready();
  const res = await client().execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [String(id)] });
  return res.rowsAffected > 0;
}

export async function countDocs(table) {
  await ready();
  const res = await client().execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(res.rows[0].n) || 0;
}

export async function maxNumeric(table, jsonPath) {
  await ready();
  const res = await client().execute(
    `SELECT MAX(CAST(json_extract(data, '$.${jsonPath}') AS INTEGER)) AS m FROM ${table}`
  );
  return Number(res.rows[0].m) || 0;
}

// ---- File storage (binary lives in its own table, served by /api/files) ----

export async function saveFile(entry) {
  await ready();
  await client().execute({
    sql: `INSERT INTO files (id, owner_type, owner_id, name, original_name, content_type, size, data, uploaded_by, uploaded_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.id, entry.owner_type || "", entry.owner_id || "", entry.name || "",
      entry.original_name || "", entry.content_type || "", entry.size || 0,
      entry.data, entry.uploaded_by || "", entry.uploaded_at || new Date().toISOString(),
    ],
  });
}

export async function getFile(id) {
  await ready();
  const res = await client().execute({
    sql: "SELECT id, name, original_name, content_type, size, data FROM files WHERE id = ?",
    args: [String(id)],
  });
  return res.rows.length ? res.rows[0] : null;
}

export async function deleteFile(id) {
  await ready();
  const res = await client().execute({ sql: "DELETE FROM files WHERE id = ?", args: [String(id)] });
  return res.rowsAffected > 0;
}

export { client };
