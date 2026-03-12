import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: any = null;

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'budget.db');
const dbDir = path.dirname(dbPath);

function ensureDir() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export async function getDb() {
  if (db) return db;

  ensureDir();
  const wasmBinary = fs.readFileSync(path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });
  let data: Uint8Array | undefined;

  if (fs.existsSync(dbPath)) {
    data = new Uint8Array(fs.readFileSync(dbPath));
  }

  db = new SQL.Database(data);

  return db;
}

export function saveDb() {
  if (!db) return;
  ensureDir();
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function dbRun(sql: string, params: unknown[] = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.run(sql, params as number | string | Uint8Array | null);
  } finally {
    saveDb();
  }
}

export function dbGet<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function dbAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function dbExec(sql: string) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql);
  saveDb();
}
