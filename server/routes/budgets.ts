import { Router } from 'express';
import { getDb, dbRun, dbAll } from '../db';

export const budgetsRouter = Router();

budgetsRouter.get('/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM budgets WHERE family_id = ?', [req.params.familyId]);
  res.json(rows);
});

budgetsRouter.post('/', async (req, res) => {
  const { id, family_id, category, limit_amount, period, color, week_start } = req.body;
  await getDb();
  dbRun(`INSERT INTO budgets (id, family_id, category, limit_amount, period, color, week_start)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      limit_amount = excluded.limit_amount,
      color = excluded.color,
      week_start = excluded.week_start`, [id, family_id, category, limit_amount, period || 'weekly', color || '#ff85a1', week_start]);
  res.json({ success: true });
});

budgetsRouter.delete('/:id', async (req, res) => {
  await getDb();
  dbRun("DELETE FROM budgets WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});
