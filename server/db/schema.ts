import { getDb, saveDb } from './index';

const MIGRATIONS = [
  "ALTER TABLE users ADD COLUMN onboarded INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN monthly_income REAL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN spending_habits TEXT",
  "ALTER TABLE users ADD COLUMN pay_amount REAL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN pay_frequency TEXT DEFAULT 'monthly'",
  "ALTER TABLE families ADD COLUMN weekly_income REAL DEFAULT 0",
  "ALTER TABLE budgets ADD COLUMN color TEXT DEFAULT '#ff85a1'",
  "ALTER TABLE budgets ADD COLUMN week_start TEXT",
  "ALTER TABLE debts ADD COLUMN min_repayment REAL DEFAULT 0",
  "ALTER TABLE debts ADD COLUMN monthly_fee REAL DEFAULT 0",
  "ALTER TABLE debts ADD COLUMN repayment_frequency TEXT DEFAULT 'monthly'",
  "ALTER TABLE meal_plans ADD COLUMN recipe_url TEXT",
  "ALTER TABLE meal_plans ADD COLUMN ingredients TEXT",
  "ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'confirmed'",
];

export async function initSchema() {
  const db = await getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      family_id TEXT,
      role TEXT DEFAULT 'member',
      subscription_status TEXT DEFAULT 'free',
      bank_connected INTEGER DEFAULT 0,
      onboarded INTEGER DEFAULT 0,
      pay_amount REAL DEFAULT 0,
      pay_frequency TEXT DEFAULT 'monthly',
      spending_habits TEXT
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      family_id TEXT,
      name TEXT,
      balance REAL,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT,
      weekly_income REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      amount REAL,
      category TEXT,
      description TEXT,
      date TEXT,
      source TEXT DEFAULT 'manual',
      family_id TEXT,
      status TEXT DEFAULT 'confirmed'
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      family_id TEXT,
      category TEXT,
      limit_amount REAL,
      period TEXT DEFAULT 'weekly',
      color TEXT DEFAULT '#ff85a1',
      week_start TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      family_id TEXT,
      name TEXT,
      target_amount REAL,
      current_amount REAL DEFAULT 0,
      deadline TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      family_id TEXT,
      name TEXT,
      total_amount REAL,
      remaining_amount REAL,
      interest_rate REAL,
      min_repayment REAL DEFAULT 0,
      monthly_fee REAL DEFAULT 0,
      repayment_frequency TEXT DEFAULT 'monthly',
      category_match TEXT,
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      family_id TEXT,
      date TEXT,
      meal_type TEXT,
      recipe_name TEXT,
      recipe_url TEXT,
      ingredients TEXT,
      estimated_cost REAL
    );

    CREATE TABLE IF NOT EXISTS grocery_prices (
      id TEXT PRIMARY KEY,
      item_name TEXT,
      store TEXT,
      price REAL,
      unit TEXT,
      last_updated TEXT
    );
  `);

  for (const sql of MIGRATIONS) {
    try {
      db.run(sql);
    } catch {
      // Column already exists
    }
  }
  saveDb();
}
