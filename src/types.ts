export interface User {
  id: string;
  email: string;
  name: string;
  family_id: string;
  role: 'admin' | 'member';
  subscription_status: 'free' | 'pro';
  bank_connected?: boolean;
  onboarded?: boolean;
  pay_amount?: number;
  pay_frequency?: 'weekly' | 'bi-weekly' | 'monthly';
  spending_habits?: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  family_id: string;
  name: string;
  balance: number;
  type: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  source: 'manual' | 'bank';
  family_id: string;
  status?: 'confirmed' | 'pending';
}

export interface Budget {
  id: string;
  family_id: string;
  category: string;
  limit_amount: number;
  period: 'weekly' | 'monthly';
  color?: string;
  week_start?: string; // ISO date string for the start of the week
}

export interface Family {
  id: string;
  name: string;
  weekly_income: number;
}

export interface Goal {
  id: string;
  family_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
}

export interface Debt {
  id: string;
  family_id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  min_repayment: number;
  monthly_fee: number;
  repayment_frequency: 'weekly' | 'fortnightly' | 'monthly';
  category_match?: string;
  due_date: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface MealPlan {
  id: string;
  family_id: string;
  date: string;
  meal_type: string;
  recipe_name: string;
  recipe_url?: string;
  ingredients: Ingredient[];
  estimated_cost: number;
}

export interface GroceryPrice {
  id: string;
  item_name: string;
  store: 'Woolworths' | 'Coles' | 'Aldi';
  price: number;
  unit: string;
  is_special?: boolean;
  special_note?: string;
}
