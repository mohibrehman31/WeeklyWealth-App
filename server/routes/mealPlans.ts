import { Router } from 'express';
import { getDb, dbRun, dbAll } from '../db';

export const mealPlansRouter = Router();

mealPlansRouter.get('/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM meal_plans WHERE family_id = ?', [req.params.familyId]);
  res.json(rows.map(p => ({ ...p, ingredients: JSON.parse(p.ingredients || '[]') })));
});

mealPlansRouter.post('/', async (req, res) => {
  const { id, family_id, date, meal_type, recipe_name, recipe_url, ingredients, estimated_cost } = req.body;
  await getDb();
  dbRun(`INSERT INTO meal_plans (id, family_id, date, meal_type, recipe_name, recipe_url, ingredients, estimated_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      meal_type = excluded.meal_type,
      recipe_name = excluded.recipe_name,
      recipe_url = excluded.recipe_url,
      ingredients = excluded.ingredients,
      estimated_cost = excluded.estimated_cost`, [id, family_id, date, meal_type, recipe_name, recipe_url, JSON.stringify(ingredients || []), estimated_cost]);
  res.json({ success: true });
});

mealPlansRouter.delete('/:id', async (req, res) => {
  await getDb();
  dbRun("DELETE FROM meal_plans WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});
