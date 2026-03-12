import { Router } from 'express';
import { getDb, dbRun, dbAll } from '../db';

export const goalsRouter = Router();

goalsRouter.get('/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM goals WHERE family_id = ?', [req.params.familyId]);
  res.json(rows);
});

goalsRouter.post('/', async (req, res) => {
  const { id, family_id, name, target_amount, current_amount, deadline } = req.body;
  await getDb();
  dbRun(`INSERT INTO goals (id, family_id, name, target_amount, current_amount, deadline)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      target_amount = excluded.target_amount,
      current_amount = excluded.current_amount,
      deadline = excluded.deadline`, [id, family_id, name, target_amount, current_amount || 0, deadline]);
  res.json({ success: true });
});

goalsRouter.delete('/:id', async (req, res) => {
  await getDb();
  dbRun("DELETE FROM goals WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});
