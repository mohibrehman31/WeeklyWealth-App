import { Router } from 'express';
import { getDb, dbRun, dbGet } from '../db';
import { generateId } from '../../shared/id';
import { DEFAULT_BUDGETS } from '../../shared/constants';

export const onboardingRouter = Router();

function weeklyIncomeFromPay(payAmount: number, payFrequency: string): number {
  if (payFrequency === 'weekly') return payAmount;
  if (payFrequency === 'bi-weekly') return payAmount / 2;
  if (payFrequency === 'monthly') return payAmount / 4.33;
  return 0;
}

onboardingRouter.post('/', async (req, res) => {
  const { userId, familyId, payAmount, payFrequency, spendingHabits, bankAccounts, debts } = req.body;
  await getDb();

  dbRun("UPDATE users SET pay_amount = ?, pay_frequency = ?, spending_habits = ?, onboarded = 1 WHERE id = ?", [payAmount, payFrequency, spendingHabits, userId]);

  const weeklyIncome = weeklyIncomeFromPay(payAmount, payFrequency);
  dbRun("UPDATE families SET weekly_income = ? WHERE id = ?", [weeklyIncome, familyId]);

  for (const acc of bankAccounts || []) {
    dbRun("INSERT INTO bank_accounts (id, user_id, family_id, name, balance, type) VALUES (?, ?, ?, ?, ?, ?)", [generateId(), userId, familyId, acc.name, acc.balance, acc.type]);
  }

  for (const debt of debts || []) {
    dbRun("INSERT INTO debts (id, family_id, name, total_amount, remaining_amount, interest_rate, min_repayment, monthly_fee, repayment_frequency, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [generateId(), familyId, debt.name, debt.amount, debt.amount, debt.interestRate || 0, debt.minRepayment || 0, 0, 'monthly', new Date().toISOString()]);
  }

  for (const b of DEFAULT_BUDGETS) {
    dbRun("INSERT INTO budgets (id, family_id, category, limit_amount, period, color) VALUES (?, ?, ?, ?, ?, ?)", [generateId(), familyId, b.category, weeklyIncome * b.percent, 'weekly', b.color]);
  }

  const user = dbGet<any>('SELECT * FROM users WHERE id = ?', [userId]);
  if (user) {
    user.bank_connected = !!user.bank_connected;
    user.onboarded = !!user.onboarded;
  }
  res.json(user || null);
});
