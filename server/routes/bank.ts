import { Router } from 'express';
import { getDb, dbRun, dbAll } from '../db';
import { generateId } from '../../shared/id';

export const bankRouter = Router();

bankRouter.get('/accounts/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM bank_accounts WHERE family_id = ?', [req.params.familyId]);
  res.json(rows);
});

bankRouter.post('/connect', async (req, res) => {
  const { userId } = req.body;
  await new Promise(r => setTimeout(r, 1500));
  await getDb();
  dbRun("UPDATE users SET bank_connected = 1 WHERE id = ?", [userId]);
  res.json({ success: true });
});

bankRouter.post('/disconnect', async (req, res) => {
  const { userId } = req.body;
  await getDb();
  dbRun("UPDATE users SET bank_connected = 0 WHERE id = ?", [userId]);
  res.json({ success: true });
});

bankRouter.post('/sync', async (req, res) => {
  const { userId, familyId } = req.body;
  await getDb();

  const mockBankTxs = [
    { description: 'WOOLWORTHS 1234', amount: 85.40 },
    { description: 'NETFLIX.COM', amount: 18.99 },
    { description: 'SHELL PETROL', amount: 65.00 },
    { description: 'RENT PAYMENT', amount: 450.00 },
  ];

  for (const tx of mockBankTxs) {
    dbRun(`INSERT INTO transactions (id, user_id, amount, category, description, date, source, family_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), userId, tx.amount, 'Uncategorized', tx.description, new Date().toISOString(), 'bank', familyId, 'pending']);
  }

  const rows = dbAll<any>('SELECT * FROM transactions WHERE family_id = ? ORDER BY date DESC', [familyId]);
  res.json(rows);
});
