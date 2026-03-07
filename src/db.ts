import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const isPostgres = !!process.env.DATABASE_URL;

let sqliteDb: any;
let pgPool: pg.Pool | null = null;

if (isPostgres) {
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
} else {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "budget.db");
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  sqliteDb = new Database(dbPath);
}

export const db = {
  exec: async (sql: string) => {
    if (isPostgres) {
      // PostgreSQL doesn't have a single exec for multiple statements easily with pg
      // We'll split by semicolon for basic initialization
      const statements = sql.split(";").filter(s => s.trim());
      for (const s of statements) {
        await pgPool!.query(s);
      }
    } else {
      sqliteDb.exec(sql);
    }
  },
  prepare: (sql: string) => {
    // Convert SQLite syntax to PostgreSQL syntax if needed (e.g., ? to $1)
    let pgSql = sql;
    if (isPostgres) {
      let count = 1;
      pgSql = sql.replace(/\?/g, () => `$${count++}`);
    }

    return {
      get: async (...args: any[]) => {
        if (isPostgres) {
          const res = await pgPool!.query(pgSql, args);
          return res.rows[0];
        } else {
          return sqliteDb.prepare(sql).get(...args);
        }
      },
      all: async (...args: any[]) => {
        if (isPostgres) {
          const res = await pgPool!.query(pgSql, args);
          return res.rows;
        } else {
          return sqliteDb.prepare(sql).all(...args);
        }
      },
      run: async (...args: any[]) => {
        if (isPostgres) {
          await pgPool!.query(pgSql, args);
          return { changes: 1 }; // Mocking SQLite return
        } else {
          return sqliteDb.prepare(sql).run(...args);
        }
      }
    };
  }
};
