import { Router } from 'express';
import { getDb, dbRun, dbGet } from '../db';

export const userRouter = Router();

function weeklyIncomeFromPay(payAmount: number, payFrequency: string): number {
  if (payFrequency === 'weekly') return payAmount;
  if (payFrequency === 'bi-weekly') return payAmount / 2;
  if (payFrequency === 'monthly') return payAmount / 4.33;
  return 0;
}

userRouter.post('/settings', async (req, res) => {
  const { userId, payAmount, payFrequency, name, email } = req.body;
  await getDb();

  dbRun("UPDATE users SET pay_amount = ?, pay_frequency = ?, name = ?, email = ? WHERE id = ?", [payAmount, payFrequency, name, email, userId]);

  const user = dbGet<any>('SELECT * FROM users WHERE id = ?', [userId]);
  if (user) {
    const weeklyIncome = weeklyIncomeFromPay(payAmount, payFrequency);
    dbRun("UPDATE families SET weekly_income = ? WHERE id = ?", [weeklyIncome, user.family_id]);
  }

  const updatedUser = dbGet<any>('SELECT * FROM users WHERE id = ?', [userId]);
  if (updatedUser) {
    updatedUser.bank_connected = !!updatedUser.bank_connected;
    updatedUser.onboarded = !!updatedUser.onboarded;
  }
  res.json(updatedUser || null);
});
