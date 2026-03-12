import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// CORS for Vercel frontend when deployed separately
const cors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
};

// For Cloud Run, use a persistent volume if available, otherwise fallback to local
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "budget.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize Database
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
    ingredients TEXT, -- JSON string
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

try {
  db.prepare("ALTER TABLE users ADD COLUMN onboarded INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN monthly_income REAL DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN spending_habits TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN pay_amount REAL DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN pay_frequency TEXT DEFAULT 'monthly'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE families ADD COLUMN weekly_income REAL DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE budgets ADD COLUMN color TEXT DEFAULT '#ff85a1'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE budgets ADD COLUMN week_start TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE debts ADD COLUMN min_repayment REAL DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE debts ADD COLUMN monthly_fee REAL DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE debts ADD COLUMN repayment_frequency TEXT DEFAULT 'monthly'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE meal_plans ADD COLUMN recipe_url TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE meal_plans ADD COLUMN ingredients TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'confirmed'").run();
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors);
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth API
  app.post("/api/auth/signup", (req, res) => {
    const { email, name, password } = req.body;
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const id = Math.random().toString(36).substr(2, 9);
    const familyId = Math.random().toString(36).substr(2, 9);
    
    db.prepare("INSERT INTO families (id, name) VALUES (?, ?)").run(familyId, `${name}'s Family`);
    db.prepare("INSERT INTO users (id, email, name, family_id, role) VALUES (?, ?, ?, ?, ?)")
      .run(id, email, name, familyId, 'admin');
    
    // Add initial mock data for the new user
    db.prepare("INSERT INTO goals (id, family_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?, ?)")
      .run(Math.random().toString(36).substr(2, 9), familyId, 'Emergency Fund', 5000, 0, '2026-12-31');
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (user) {
      user.bank_connected = !!user.bank_connected;
      user.onboarded = !!user.onboarded;
    }
    res.json(user || null);
  });

  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) {
      return res.status(401).json({ error: "Invalid email" });
    }
    
    if (user) {
      user.bank_connected = !!user.bank_connected;
      user.onboarded = !!user.onboarded;
    }
    res.json(user || null);
  });

  // Onboarding API
  app.post("/api/onboarding", (req, res) => {
    const { userId, familyId, payAmount, payFrequency, spendingHabits, bankAccounts, debts } = req.body;
    
    db.prepare("UPDATE users SET pay_amount = ?, pay_frequency = ?, spending_habits = ?, onboarded = 1 WHERE id = ?")
      .run(payAmount, payFrequency, spendingHabits, userId);
    
    let weeklyIncome = 0;
    if (payFrequency === 'weekly') weeklyIncome = payAmount;
    else if (payFrequency === 'bi-weekly') weeklyIncome = payAmount / 2;
    else if (payFrequency === 'monthly') weeklyIncome = payAmount / 4.33;

    db.prepare("UPDATE families SET weekly_income = ? WHERE id = ?")
      .run(weeklyIncome, familyId);

    // Save bank accounts
    for (const acc of bankAccounts) {
      db.prepare("INSERT INTO bank_accounts (id, user_id, family_id, name, balance, type) VALUES (?, ?, ?, ?, ?, ?)")
        .run(Math.random().toString(36).substr(2, 9), userId, familyId, acc.name, acc.balance, acc.type);
    }

    // Save debts
    for (const debt of debts) {
      db.prepare("INSERT INTO debts (id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(Math.random().toString(36).substr(2, 9), familyId, debt.name, debt.amount, debt.amount, debt.interestRate || 0, debt.minRepayment || 0, 0, 'monthly', new Date().toISOString());
    }

    // Generate default budgets based on income
    const defaultBudgets = [
      { category: 'Housing', percent: 0.30, color: '#FF85A1' },
      { category: 'Food', percent: 0.15, color: '#BDE0FE' },
      { category: 'Transport', percent: 0.10, color: '#FFD6A5' },
      { category: 'Utilities', percent: 0.05, color: '#FDFFB6' },
      { category: 'Entertainment', percent: 0.05, color: '#CAFFBF' },
      { category: 'Health', percent: 0.05, color: '#D0D1FF' },
      { category: 'Shopping', percent: 0.05, color: '#FFADAD' },
      { category: 'Other', percent: 0.05, color: '#9BF6FF' },
    ];

    for (const b of defaultBudgets) {
      db.prepare("INSERT INTO budgets (id, family_id, category, limit_amount, period, color) VALUES (?, ?, ?, ?, ?, ?)")
        .run(Math.random().toString(36).substr(2, 9), familyId, b.category, weeklyIncome * b.percent, 'weekly', b.color);
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (user) {
      user.bank_connected = !!user.bank_connected;
      user.onboarded = !!user.onboarded;
    }
    res.json(user || null);
  });

  app.post("/api/user/settings", (req, res) => {
    const { userId, payAmount, payFrequency, name, email } = req.body;
    
    db.prepare("UPDATE users SET pay_amount = ?, pay_frequency = ?, name = ?, email = ? WHERE id = ?")
      .run(payAmount, payFrequency, name, email, userId);
    
    // Update family weekly income as well
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (user) {
      let weeklyIncome = 0;
      if (payFrequency === 'weekly') weeklyIncome = payAmount;
      else if (payFrequency === 'bi-weekly') weeklyIncome = payAmount / 2;
      else if (payFrequency === 'monthly') weeklyIncome = payAmount / 4.33;

      db.prepare("UPDATE families SET weekly_income = ? WHERE id = ?")
        .run(weeklyIncome, user.family_id);
    }

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (updatedUser) {
      updatedUser.bank_connected = !!updatedUser.bank_connected;
      updatedUser.onboarded = !!updatedUser.onboarded;
    }
    res.json(updatedUser || null);
  });

  app.get("/api/bank-accounts/:familyId", (req, res) => {
    const accounts = db.prepare("SELECT * FROM bank_accounts WHERE family_id = ?").all(req.params.familyId);
    res.json(accounts);
  });

  const CATEGORIES = ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'];

  // Transactions
  app.get("/api/transactions/:familyId", (req, res) => {
    const transactions = db.prepare("SELECT * FROM transactions WHERE family_id = ? ORDER BY date DESC").all(req.params.familyId);
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { id, user_id, amount, category, description, date, family_id } = req.body;
    db.prepare("INSERT INTO transactions (id, user_id, amount, category, description, date, family_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, user_id, amount, category, description, date, family_id);
    res.json({ success: true });
  });

  // Budgets
  app.get("/api/budgets/:familyId", (req, res) => {
    const budgets = db.prepare("SELECT * FROM budgets WHERE family_id = ?").all(req.params.familyId);
    res.json(budgets);
  });

  app.post("/api/budgets", (req, res) => {
    const { id, family_id, category, limit_amount, period, color, week_start } = req.body;
    db.prepare(`
      INSERT INTO budgets (id, family_id, category, limit_amount, period, color, week_start)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        limit_amount = excluded.limit_amount,
        color = excluded.color,
        week_start = excluded.week_start
    `).run(id, family_id, category, limit_amount, period || 'weekly', color || '#ff85a1', week_start);
    res.json({ success: true });
  });

  app.delete("/api/budgets/:id", (req, res) => {
    db.prepare("DELETE FROM budgets WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Family Income
  app.get("/api/family/members/:familyId", (req, res) => {
    const { familyId } = req.params;
    const members = db.prepare("SELECT id, email, name, role FROM users WHERE family_id = ?").all(familyId);
    res.json(members);
  });

  app.post("/api/family/invite", (req, res) => {
    const { email, name, familyId } = req.body;
    
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (existingUser) {
      // If user exists, update their family_id if they don't have one or if it's a different one
      // For simplicity, we'll just update it to join this family
      db.prepare("UPDATE users SET family_id = ?, role = 'member' WHERE id = ?").run(familyId, existingUser.id);
      return res.json({ status: "ok", message: "User added to family" });
    }

    const id = Math.random().toString(36).substr(2, 9);
    db.prepare("INSERT INTO users (id, email, name, family_id, role) VALUES (?, ?, ?, ?, ?)")
      .run(id, email, name, familyId, 'member');
    
    res.json({ status: "ok", message: "Invitation sent (User created)" });
  });

  app.get("/api/families/:id", (req, res) => {
    const family = db.prepare("SELECT * FROM families WHERE id = ?").get(req.params.id);
    res.json(family || null);
  });

  app.post("/api/families/income", (req, res) => {
    const { familyId, income } = req.body;
    db.prepare("UPDATE families SET weekly_income = ? WHERE id = ?").run(income, familyId);
    res.json({ success: true });
  });

  // Goals
  app.get("/api/goals/:familyId", (req, res) => {
    const goals = db.prepare("SELECT * FROM goals WHERE family_id = ?").all(req.params.familyId);
    res.json(goals);
  });

  app.post("/api/goals", (req, res) => {
    const { id, family_id, name, target_amount, current_amount, deadline } = req.body;
    db.prepare(`
      INSERT INTO goals (id, family_id, name, target_amount, current_amount, deadline)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        target_amount = excluded.target_amount,
        current_amount = excluded.current_amount,
        deadline = excluded.deadline
    `).run(id, family_id, name, target_amount, current_amount || 0, deadline);
    res.json({ success: true });
  });

  app.delete("/api/goals/:id", (req, res) => {
    db.prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Debts
  app.get("/api/debts/:familyId", (req, res) => {
    const debts = db.prepare("SELECT * FROM debts WHERE family_id = ?").all(req.params.familyId);
    res.json(debts);
  });

  app.post("/api/debts", (req, res) => {
    const { id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, category_match, due_date } = req.body;
    db.prepare(`
      INSERT INTO debts (id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, category_match, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        total_amount = excluded.total_amount,
        remaining_amount = excluded.remaining_amount,
        interest_rate = excluded.interest_rate,
        min_repayment = excluded.min_repayment,
        monthly_fee = excluded.monthly_fee,
        repayment_frequency = excluded.repayment_frequency,
        category_match = excluded.category_match,
        due_date = excluded.due_date
    `).run(id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, category_match, due_date);
    res.json({ success: true });
  });

  app.delete("/api/debts/:id", (req, res) => {
    db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Meal Plans
  app.get("/api/meal-plans/:familyId", (req, res) => {
    const plans = db.prepare("SELECT * FROM meal_plans WHERE family_id = ?").all(req.params.familyId);
    res.json(plans.map(p => ({ ...p, ingredients: JSON.parse(p.ingredients || '[]') })));
  });

  app.post("/api/meal-plans", (req, res) => {
    const { id, family_id, date, meal_type, recipe_name, recipe_url, ingredients, estimated_cost } = req.body;
    db.prepare(`
      INSERT INTO meal_plans (id, family_id, date, meal_type, recipe_name, recipe_url, ingredients, estimated_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        meal_type = excluded.meal_type,
        recipe_name = excluded.recipe_name,
        recipe_url = excluded.recipe_url,
        ingredients = excluded.ingredients,
        estimated_cost = excluded.estimated_cost
    `).run(id, family_id, date, meal_type, recipe_name, recipe_url, JSON.stringify(ingredients), estimated_cost);
    res.json({ success: true });
  });

  app.delete("/api/meal-plans/:id", (req, res) => {
    db.prepare("DELETE FROM meal_plans WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Bank Integration
  app.post("/api/bank/connect", async (req, res) => {
    const { userId } = req.body;
    // Mock delay for "connecting" feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    db.prepare("UPDATE users SET bank_connected = 1 WHERE id = ?").run(userId);
    res.json({ success: true });
  });

  app.post("/api/bank/disconnect", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE users SET bank_connected = 0 WHERE id = ?").run(userId);
    res.json({ success: true });
  });

  app.post("/api/bank/sync", (req, res) => {
    const { userId, familyId } = req.body;
    
    // Mock bank transactions
    const mockBankTxs = [
      { id: Math.random().toString(36).substr(2, 9), description: 'WOOLWORTHS 1234', amount: 85.40, date: new Date().toISOString() },
      { id: Math.random().toString(36).substr(2, 9), description: 'NETFLIX.COM', amount: 18.99, date: new Date().toISOString() },
      { id: Math.random().toString(36).substr(2, 9), description: 'SHELL PETROL', amount: 65.00, date: new Date().toISOString() },
      { id: Math.random().toString(36).substr(2, 9), description: 'RENT PAYMENT', amount: 450.00, date: new Date().toISOString() },
    ];

    for (const tx of mockBankTxs) {
      db.prepare(`
        INSERT INTO transactions (id, user_id, amount, category, description, date, source, family_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(tx.id, userId, tx.amount, 'Uncategorized', tx.description, tx.date, 'bank', familyId, 'pending');
    }

    const allTransactions = db.prepare("SELECT * FROM transactions WHERE family_id = ? ORDER BY date DESC").all(familyId);
    res.json(allTransactions);
  });

  app.post("/api/transactions/categorize", (req, res) => {
    const { transactionId, category } = req.body;
    db.prepare("UPDATE transactions SET category = ?, status = 'confirmed' WHERE id = ?").run(category, transactionId);
    res.json({ success: true });
  });

  // Basiq Sync Mock
  app.post("/api/basiq/sync", (req, res) => {
    // Simulate Basiq sync
    res.json({ status: "syncing", message: "Connecting to Basiq..." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
