import { Router } from 'express';
import { getDb, dbRun, dbGet } from '../db';
import { generateId } from '../../shared/id';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, name } = req.body;
  await getDb();

  const existingUser = dbGet<{ id: string }>('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const id = generateId();
  const familyId = generateId();

  dbRun("INSERT INTO families (id, name) VALUES (?, ?)", [familyId, `${name}'s Family`]);
  dbRun("INSERT INTO users (id, email, name, family_id, role) VALUES (?, ?, ?, ?, ?)", [id, email, name, familyId, 'admin']);
  dbRun("INSERT INTO goals (id, family_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?, ?)", [generateId(), familyId, 'Emergency Fund', 5000, 0, '2026-12-31']);

  const user = dbGet<any>('SELECT * FROM users WHERE id = ?', [id]);
  if (user) {
    user.bank_connected = !!user.bank_connected;
    user.onboarded = !!user.onboarded;
  }
  res.json(user || null);
});

authRouter.post('/login', async (req, res) => {
  const { email } = req.body;
  const user = dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email' });
  }

  user.bank_connected = !!user.bank_connected;
  user.onboarded = !!user.onboarded;
  res.json(user);
});
