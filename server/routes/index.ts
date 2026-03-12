import { Router } from 'express';
import { authRouter } from './auth';
import { onboardingRouter } from './onboarding';
import { userRouter } from './user';
import { transactionsRouter } from './transactions';
import { budgetsRouter } from './budgets';
import { goalsRouter } from './goals';
import { debtsRouter } from './debts';
import { mealPlansRouter } from './mealPlans';
import { familyRouter } from './family';
import { bankRouter } from './bank';
import { aiRouter } from './ai';
import { getDb, dbAll, dbGet, dbRun } from '../db';

export const apiRouter = Router();

apiRouter.get('/health', (_, res) => res.json({ status: 'ok' }));

apiRouter.get('/bank-accounts/:familyId', async (req, res) => {
  await getDb();
  const rows = dbAll<any>('SELECT * FROM bank_accounts WHERE family_id = ?', [req.params.familyId]);
  res.json(rows);
});

apiRouter.post('/families/income', async (req, res) => {
  const { familyId, income } = req.body;
  await getDb();
  dbRun("UPDATE families SET weekly_income = ? WHERE id = ?", [income, familyId]);
  res.json({ success: true });
});

apiRouter.get('/families/:id', async (req, res) => {
  await getDb();
  const row = dbGet<any>('SELECT * FROM families WHERE id = ?', [req.params.id]);
  res.json(row || null);
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/onboarding', onboardingRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/budgets', budgetsRouter);
apiRouter.use('/goals', goalsRouter);
apiRouter.use('/debts', debtsRouter);
apiRouter.use('/meal-plans', mealPlansRouter);
apiRouter.use('/family', familyRouter);
apiRouter.use('/bank', bankRouter);
apiRouter.use('/ai', aiRouter);
