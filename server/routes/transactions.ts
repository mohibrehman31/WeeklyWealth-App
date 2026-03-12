import { Router } from 'express';
import { getDb, dbRun, dbGet, dbAll } from '../db';
import { generateId } from '../../shared/id';

export const transactionsRouter = Router();

transactionsRouter.get('/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM transactions WHERE family_id = ? ORDER BY date DESC', [req.params.familyId]);
  res.json(rows);
});

transactionsRouter.post('/', async (req, res) => {
  const { id, user_id, amount, category, description, date, family_id } = req.body;
  await getDb();
  dbRun("INSERT INTO transactions (id, user_id, amount, category, description, date, family_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [id || generateId(), user_id, amount, category, description, date, family_id]);
  res.json({ success: true });
});

transactionsRouter.post('/categorize', async (req, res) => {
  const { transactionId, category } = req.body;
  await getDb();
  dbRun("UPDATE transactions SET category = ?, status = 'confirmed' WHERE id = ?", [category, transactionId]);
  res.json({ success: true });
});
