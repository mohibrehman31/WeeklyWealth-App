import { Router } from 'express';
import { getDb, dbRun, dbAll } from '../db';

export const debtsRouter = Router();

debtsRouter.get('/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM debts WHERE family_id = ?', [req.params.familyId]);
  res.json(rows);
});

debtsRouter.post('/', async (req, res) => {
  const { id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, category_match, due_date } = req.body;
  await getDb();
  dbRun(`INSERT INTO debts (id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, category_match, due_date)
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
      due_date = excluded.due_date`, [id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, category_match, due_date]);
  res.json({ success: true });
});

debtsRouter.delete('/:id', async (req, res) => {
  await getDb();
  dbRun("DELETE FROM debts WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});
