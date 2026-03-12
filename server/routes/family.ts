import { Router } from 'express';
import { getDb, dbRun, dbGet, dbAll } from '../db';
import { generateId } from '../../shared/id';

export const familyRouter = Router();

familyRouter.get('/members/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT id, email, name, role FROM users WHERE family_id = ?', [req.params.familyId]);
  res.json(rows);
});

familyRouter.post('/invite', async (req, res) => {
  const { email, name, familyId } = req.body;
  await getDb();

  const existingUser = dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser) {
    dbRun("UPDATE users SET family_id = ?, role = 'member' WHERE id = ?", [familyId, existingUser.id]);
    return res.json({ status: 'ok', message: 'User added to family' });
  }

  const id = generateId();
  dbRun("INSERT INTO users (id, email, name, family_id, role) VALUES (?, ?, ?, ?, ?)", [id, email, name, familyId, 'member']);
  res.json({ status: 'ok', message: 'Invitation sent (User created)' });
});

familyRouter.get('/:id', async (req, res) => {
  await getDb();
  const row = dbGet<any>('SELECT * FROM families WHERE id = ?', [req.params.id]);
  res.json(row || null);
});

familyRouter.post('/income', async (req, res) => {
  const { familyId, income } = req.body;
  await getDb();
  dbRun("UPDATE families SET weekly_income = ? WHERE id = ?", [income, familyId]);
  res.json({ success: true });
});
