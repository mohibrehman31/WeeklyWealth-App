export const CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'
] as const;

export const COLORS = [
  '#FF85A1', '#BDE0FE', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#D0D1FF', '#FFADAD', '#9BF6FF'
];

export const DEFAULT_BUDGETS = [
  { category: 'Housing' as const, percent: 0.30, color: '#FF85A1' },
  { category: 'Food' as const, percent: 0.15, color: '#BDE0FE' },
  { category: 'Transport' as const, percent: 0.10, color: '#FFD6A5' },
  { category: 'Utilities' as const, percent: 0.05, color: '#FDFFB6' },
  { category: 'Entertainment' as const, percent: 0.05, color: '#CAFFBF' },
  { category: 'Health' as const, percent: 0.05, color: '#D0D1FF' },
  { category: 'Shopping' as const, percent: 0.05, color: '#FFADAD' },
  { category: 'Other' as const, percent: 0.05, color: '#9BF6FF' },
];
