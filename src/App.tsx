import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Target, 
  CreditCard, 
  Utensils, 
  Settings, 
  TrendingUp,
  Plus,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ShieldCheck,
  ShoppingCart,
  Menu,
  X,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  UserPlus,
  Copy,
  CheckCircle2,
  Circle,
  Smartphone
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek, differenceInWeeks } from 'date-fns';
import { User, Transaction, Budget, Goal, Debt, MealPlan, GroceryPrice, Family, Ingredient, BankAccount } from './types';

// --- Mock Data & Constants ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const COLORS = ['#FF85A1', '#BDE0FE', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#D0D1FF', '#FFADAD', '#9BF6FF'];

const CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'
];

// --- Components ---

const Card = ({ children, className = "", style = {}, onClick }: { children: React.ReactNode, className?: string, style?: React.CSSProperties, onClick?: () => void }) => (
  <div className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-100/50 ${className}`} style={style} onClick={onClick}>
    {children}
  </div>
);

const ProgressBar = ({ current, target, color = "bg-primary" }: { current: number, target: number, color?: string }) => {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="w-full bg-slate-100/80 rounded-full h-2.5 mt-2">
      <div 
        className={`${color} h-2.5 rounded-full transition-all duration-700 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: 0,
    current_amount: 0,
    deadline: format(new Date(), 'yyyy-MM-dd')
  });
  const [savingsAmount, setSavingsAmount] = useState<{ [key: string]: string }>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  const handleSaveGoal = async () => {
    if (!user || !goalForm.name || goalForm.target_amount <= 0) return;

    const goalData = {
      id: editingGoal?.id || Math.random().toString(36).substr(2, 9),
      family_id: user.family_id,
      ...goalForm
    };

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData)
      });

      if (res.ok) {
        setIsAddingGoal(false);
        setIsEditingGoal(false);
        setEditingGoal(null);
        setGoalForm({ name: '', target_amount: 0, current_amount: 0, deadline: format(new Date(), 'yyyy-MM-dd') });
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to save goal", e);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user || !confirm("Are you sure you want to delete this goal?")) return;

    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to delete goal", e);
    }
  };

  const handleAddSavings = async (goalId: string) => {
    const amount = parseFloat(savingsAmount[goalId] || '0');
    if (!user || amount <= 0) return;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedGoal = {
      ...goal,
      current_amount: goal.current_amount + amount
    };

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGoal)
      });

      if (res.ok) {
        setSavingsAmount(prev => ({ ...prev, [goalId]: '' }));
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to add savings", e);
    }
  };
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [isEditingDebt, setIsEditingDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtForm, setDebtForm] = useState<{
    name: string;
    total_amount: number;
    remaining_amount: number;
    interest_rate: number;
    min_repayment: number;
    monthly_fee: number;
    repayment_frequency: 'weekly' | 'fortnightly' | 'monthly';
    category_match: string;
    due_date: string;
  }>({
    name: '',
    total_amount: 0,
    remaining_amount: 0,
    interest_rate: 0,
    min_repayment: 0,
    monthly_fee: 0,
    repayment_frequency: 'monthly',
    category_match: '',
    due_date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSaveDebt = async () => {
    if (!user || !debtForm.name || debtForm.total_amount <= 0) return;

    const debtData = {
      id: editingDebt?.id || Math.random().toString(36).substr(2, 9),
      family_id: user.family_id,
      ...debtForm
    };

    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtData)
      });

      if (res.ok) {
        setIsAddingDebt(false);
        setIsEditingDebt(false);
        setEditingDebt(null);
        setDebtForm({
          name: '',
          total_amount: 0,
          remaining_amount: 0,
          interest_rate: 0,
          min_repayment: 0,
          monthly_fee: 0,
          repayment_frequency: 'monthly',
          category_match: '',
          due_date: format(new Date(), 'yyyy-MM-dd')
        });
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to save debt", e);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!user || !confirm("Are you sure you want to delete this debt?")) return;

    try {
      const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to delete debt", e);
    }
  };
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealPlan | null>(null);
  const [mealForm, setMealForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    meal_type: 'Dinner',
    recipe_name: '',
    recipe_url: '',
    ingredients: [] as Ingredient[],
    estimated_cost: 0
  });

  const handleSaveMeal = async () => {
    if (!user || !mealForm.recipe_name) return;

    const mealData = {
      id: editingMeal?.id || Math.random().toString(36).substr(2, 9),
      family_id: user.family_id,
      ...mealForm
    };

    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData)
      });

      if (res.ok) {
        setIsAddingMeal(false);
        setIsEditingMeal(false);
        setEditingMeal(null);
        setMealForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          meal_type: 'Dinner',
          recipe_name: '',
          recipe_url: '',
          ingredients: [],
          estimated_cost: 0
        });
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to save meal plan", e);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!user || !confirm("Are you sure you want to delete this meal?")) return;

    try {
      const res = await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsEditingMeal(false);
        setEditingMeal(null);
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to delete meal plan", e);
    }
  };

  const handlePrefillFromURL = async (url: string) => {
    if (!url) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract recipe details from this URL: ${url}. Return the recipe name and a list of ingredients with amounts and units.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recipe_name: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.STRING },
                    unit: { type: Type.STRING }
                  },
                  required: ["name", "amount", "unit"]
                }
              }
            },
            required: ["recipe_name", "ingredients"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setMealForm(prev => ({
        ...prev,
        recipe_name: data.recipe_name || prev.recipe_name,
        ingredients: data.ingredients || prev.ingredients
      }));
    } catch (e) {
      console.error("Failed to prefill from URL", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIIdeas = async () => {
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Generate 5 healthy dinner ideas for a family. Return the recipe names and a brief description for each.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "description"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Failed to generate AI ideas", e);
      return [];
    } finally {
      setLoading(false);
    }
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('weeklywealth_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData && userData.family_id) {
          setUser(userData);
          fetchAppData(userData.family_id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem('weeklywealth_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAppData = async (familyId: string) => {
    if (!familyId) return;
    setLoading(true);
    try {
      const [tRes, bRes, gRes, dRes, mRes, fRes, baRes, fmRes] = await Promise.all([
        fetch(`/api/transactions/${familyId}`),
        fetch(`/api/budgets/${familyId}`),
        fetch(`/api/goals/${familyId}`),
        fetch(`/api/debts/${familyId}`),
        fetch(`/api/meal-plans/${familyId}`),
        fetch(`/api/families/${familyId}`),
        fetch(`/api/bank-accounts/${familyId}`),
        fetch(`/api/family/members/${familyId}`)
      ]);

      const results = await Promise.all([
        tRes.ok ? tRes.json() : Promise.resolve([]),
        bRes.ok ? bRes.json() : Promise.resolve([]),
        gRes.ok ? gRes.json() : Promise.resolve([]),
        dRes.ok ? dRes.json() : Promise.resolve([]),
        mRes.ok ? mRes.json() : Promise.resolve([]),
        fRes.ok ? fRes.json() : Promise.resolve(null),
        baRes.ok ? baRes.json() : Promise.resolve([]),
        fmRes.ok ? fmRes.json() : Promise.resolve([])
      ]);

      setTransactions(results[0]);
      setBudgets(results[1]);
      setGoals(results[2]);
      setDebts(results[3]);
      setMealPlans(results[4]);
      setFamily(results[5]);
      setBankAccounts(results[6]);
      setFamilyMembers(results[7]);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Login failed');
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('weeklywealth_user', JSON.stringify(userData));
      fetchAppData(userData.family_id);
    } catch (e) {
      alert("Invalid email. Try 'demo@prosper.com' or sign up!");
    }
  };

  const handleSignup = async (email: string, name: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      if (!res.ok) throw new Error('Signup failed');
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('weeklywealth_user', JSON.stringify(userData));
      fetchAppData(userData.family_id);
    } catch (e) {
      alert("Signup failed. User might already exist.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('weeklywealth_user');
    setActiveTab('dashboard');
  };

  const handleConnectBank = async () => {
    if (!user) return;
    setIsConnectingBank(true);
    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const updatedUser = { ...user, bank_connected: true };
        setUser(updatedUser);
        localStorage.setItem('weeklywealth_user', JSON.stringify(updatedUser));
      } else {
        alert("Failed to connect to bank. Please try again.");
      }
    } catch (e) {
      console.error("Failed to connect bank", e);
      alert("Connection error. Please check your internet.");
    } finally {
      setIsConnectingBank(false);
    }
  };

  const handleDisconnectBank = async () => {
    if (!user) return;
    console.log("Disconnecting bank for user:", user.id);
    
    try {
      const res = await fetch('/api/bank/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const updatedUser = { ...user, bank_connected: false };
        setUser(updatedUser);
        localStorage.setItem('weeklywealth_user', JSON.stringify(updatedUser));
        console.log("Bank disconnected successfully");
      } else {
        console.error("Failed to disconnect bank: Server returned", res.status);
      }
    } catch (e) {
      console.error("Failed to disconnect bank", e);
    }
  };

  const handleSyncTransactions = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, familyId: user.family_id })
      });
      if (res.ok) {
        const newTransactions = await res.json();
        setTransactions(newTransactions);
        // After syncing, try to auto-categorize pending ones
        autoCategorizeTransactions(newTransactions.filter((t: Transaction) => t.status === 'pending'));
      }
    } catch (e) {
      console.error("Failed to sync transactions", e);
    }
  };

  const handleInviteMember = async (email: string, name: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, familyId: user.family_id })
      });
      if (res.ok) {
        fetchAppData(user.family_id);
      }
    } catch (e) {
      console.error("Failed to invite member", e);
    }
  };

  const autoCategorizeTransactions = async (pending: Transaction[]) => {
    for (const t of pending) {
      try {
        const aiResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Categorize this bank transaction: "${t.description}". 
          Valid categories: ${CATEGORIES.join(', ')}. 
          Return ONLY the category name. If unsure, return "Uncategorized".`,
        });
        
        const category = aiResponse.text?.trim() || "Uncategorized";
        if (category !== "Uncategorized" && CATEGORIES.includes(category)) {
          await handleManualCategorize(t.id, category);
        }
      } catch (e) {
        console.error("AI Categorization failed for", t.description, e);
      }
    }
  };

  const handleManualCategorize = async (transactionId: string, category: string) => {
    try {
      const res = await fetch('/api/transactions/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, category })
      });
      if (res.ok) {
        setTransactions(prev => prev.map(t => 
          t.id === transactionId ? { ...t, category, status: 'confirmed' } : t
        ));
      }
    } catch (e) {
      console.error("Failed to categorize", e);
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#fcfcfd]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium tracking-wide">Wealth is coming your way...</p>
      </div>
    </div>
  );

  if (!user) {
    if (!showAuth) {
      return <LandingView onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }} onLogin={() => { setAuthMode('login'); setShowAuth(true); }} />;
    }
    return <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onSignup={handleSignup} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: Wallet },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'debts', label: 'Debt Tracker', icon: CreditCard },
    { id: 'meals', label: 'Meal Planner', icon: Utensils },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: X },
  ];

  const renderContent = () => {
    if (user && !user.onboarded) {
      return (
        <OnboardingView 
          user={user} 
          onComplete={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('weeklywealth_user', JSON.stringify(updatedUser));
            fetchAppData(updatedUser.family_id);
          }} 
        />
      );
    }

    const pendingTransactions = transactions.filter(t => t.status === 'pending');

    return (
      <>
        {pendingTransactions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-warning/20 border-warning/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-warning/40 rounded-xl flex items-center justify-center">
                  <AlertCircle className="text-accent w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Action Required</h3>
                  <p className="text-sm text-slate-600">We found {pendingTransactions.length} transactions that need categorizing.</p>
                </div>
              </div>
              <div className="space-y-3">
                {pendingTransactions.map(t => (
                  <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-2xl border border-warning/30 gap-4">
                    <div>
                      <p className="font-bold text-slate-700">{t.description}</p>
                      <p className="text-sm text-slate-400">${t.amount.toFixed(2)} • {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                      {CATEGORIES.slice(0, 5).map(cat => (
                        <button 
                          key={cat}
                          onClick={() => handleManualCategorize(t.id, cat)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-primary/10 hover:text-primary text-slate-500 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                        >
                          {cat}
                        </button>
                      ))}
                      <select 
                        onChange={(e) => handleManualCategorize(t.id, e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg outline-none cursor-pointer"
                      >
                        <option value="">More...</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {(() => {
          switch (activeTab) {
            case 'dashboard': return (
              <Dashboard 
                transactions={transactions} 
                budgets={budgets} 
                goals={goals} 
                bankAccounts={bankAccounts}
                onViewAllTransactions={() => setActiveTab('transactions')}
                onAddGoal={() => {
                  setGoalForm({ name: '', target_amount: 0, current_amount: 0, deadline: format(new Date(), 'yyyy-MM-dd') });
                  setIsAddingGoal(true);
                }}
              />
            );
            case 'transactions': return <TransactionsView transactions={transactions} setTransactions={setTransactions} user={user} onSync={handleSyncTransactions} />;
            case 'budgets': return <BudgetsView budgets={budgets} setBudgets={setBudgets} transactions={transactions} setTransactions={setTransactions} family={family} setFamily={setFamily} />;
            case 'goals': return (
              <GoalsView 
                goals={goals} 
                onAddGoal={() => {
                  setGoalForm({ name: '', target_amount: 0, current_amount: 0, deadline: format(new Date(), 'yyyy-MM-dd') });
                  setIsAddingGoal(true);
                }}
                onEditGoal={(goal) => {
                  setEditingGoal(goal);
                  setGoalForm({
                    name: goal.name,
                    target_amount: goal.target_amount,
                    current_amount: goal.current_amount,
                    deadline: goal.deadline
                  });
                  setIsEditingGoal(true);
                }}
                onAddSavings={handleAddSavings}
                savingsAmount={savingsAmount}
                setSavingsAmount={setSavingsAmount}
              />
            );
            case 'debts': return (
              <DebtsView 
                debts={debts} 
                transactions={transactions}
                onAddDebt={() => {
                  setDebtForm({
                    name: '',
                    total_amount: 0,
                    remaining_amount: 0,
                    interest_rate: 0,
                    min_repayment: 0,
                    monthly_fee: 0,
                    repayment_frequency: 'monthly',
                    category_match: '',
                    due_date: format(new Date(), 'yyyy-MM-dd')
                  });
                  setIsAddingDebt(true);
                }}
                onEditDebt={(debt) => {
                  setEditingDebt(debt);
                  setDebtForm({
                    name: debt.name,
                    total_amount: debt.total_amount,
                    remaining_amount: debt.remaining_amount,
                    interest_rate: debt.interest_rate,
                    min_repayment: debt.min_repayment,
                    monthly_fee: debt.monthly_fee,
                    repayment_frequency: debt.repayment_frequency,
                    category_match: debt.category_match || '',
                    due_date: debt.due_date
                  });
                  setIsEditingDebt(true);
                }}
              />
            );
            case 'meals': return (
              <MealPlannerView 
                mealPlans={mealPlans} 
                onAddMeal={(date) => {
                  setMealForm({
                    date: date || format(new Date(), 'yyyy-MM-dd'),
                    meal_type: 'Dinner',
                    recipe_name: '',
                    recipe_url: '',
                    ingredients: [],
                    estimated_cost: 0
                  });
                  setIsAddingMeal(true);
                }}
                onEditMeal={(meal) => {
                  setEditingMeal(meal);
                  setMealForm({
                    date: meal.date,
                    meal_type: meal.meal_type,
                    recipe_name: meal.recipe_name,
                    recipe_url: meal.recipe_url || '',
                    ingredients: meal.ingredients || [],
                    estimated_cost: meal.estimated_cost
                  });
                  setIsEditingMeal(true);
                }}
              />
            );
            case 'family': return <FamilyView user={user} familyMembers={familyMembers} onConnectBank={handleConnectBank} onDisconnectBank={handleDisconnectBank} isConnecting={isConnectingBank} onInviteMember={handleInviteMember} />;
            case 'settings': return (
              <SettingsView 
                user={user} 
                onUpdateUser={(updatedUser) => {
                  setUser(updatedUser);
                  localStorage.setItem('weeklywealth_user', JSON.stringify(updatedUser));
                  if (updatedUser.family_id) fetchAppData(updatedUser.family_id);
                }} 
              />
            );
            default: return (
              <Dashboard 
                transactions={transactions} 
                budgets={budgets} 
                goals={goals} 
                bankAccounts={bankAccounts}
                onViewAllTransactions={() => setActiveTab('transactions')}
                onAddGoal={() => {
                  setGoalForm({ name: '', target_amount: 0, current_amount: 0, deadline: format(new Date(), 'yyyy-MM-dd') });
                  setIsAddingGoal(true);
                }}
              />
            );
          }
        })()}
      </>
    );
  };

  const handleNavClick = (id: string) => {
    if (id === 'logout') {
      handleLogout();
    } else {
      setActiveTab(id);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-700">WeeklyWealth</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar / Navigation */}
      <nav className={`
        fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 md:border-r md:border-slate-100 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-2xl text-slate-700 tracking-tight">WeeklyWealth</span>
        </div>

        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-primary/10 text-primary font-semibold' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
              `}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-primary' : 'text-slate-300'}`} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-50">
          <div className="bg-primary/5 rounded-3xl p-5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Pro Plan</span>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-3">Family Sync Active</p>
            <button className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all shadow-sm">
              Manage
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Edit/Add Meal Modal */}
      <AnimatePresence>
        {(isEditingMeal || isAddingMeal) && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-700 tracking-tight">
                  {isAddingMeal ? 'Add Meal' : `Edit ${editingMeal?.recipe_name}`}
                </h2>
                <button 
                  onClick={() => {
                    setIsEditingMeal(false);
                    setIsAddingMeal(false);
                    setEditingMeal(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Meal Type</label>
                    <select 
                      value={mealForm.meal_type}
                      onChange={e => setMealForm({ ...mealForm, meal_type: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium appearance-none"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" 
                      value={mealForm.date}
                      onChange={e => setMealForm({ ...mealForm, date: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recipe URL (to prefill)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={mealForm.recipe_url}
                      onChange={e => setMealForm({ ...mealForm, recipe_url: e.target.value })}
                      className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="https://..."
                    />
                    <button 
                      onClick={() => handlePrefillFromURL(mealForm.recipe_url)}
                      className="px-6 py-3 bg-primary/10 text-primary rounded-2xl font-bold hover:bg-primary/20 transition-all"
                    >
                      Prefill
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recipe Name</label>
                  <input 
                    type="text" 
                    value={mealForm.recipe_name}
                    onChange={e => setMealForm({ ...mealForm, recipe_name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    placeholder="e.g. Spaghetti Carbonara"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Ingredients</label>
                    <button 
                      onClick={() => setMealForm({ ...mealForm, ingredients: [...mealForm.ingredients, { name: '', amount: '', unit: '' }] })}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                  <div className="space-y-3">
                    {mealForm.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text" 
                          value={ing.name}
                          onChange={e => {
                            const newIngs = [...mealForm.ingredients];
                            newIngs[idx].name = e.target.value;
                            setMealForm({ ...mealForm, ingredients: newIngs });
                          }}
                          className="flex-[2] px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                          placeholder="Ingredient name"
                        />
                        <input 
                          type="text" 
                          value={ing.amount}
                          onChange={e => {
                            const newIngs = [...mealForm.ingredients];
                            newIngs[idx].amount = e.target.value;
                            setMealForm({ ...mealForm, ingredients: newIngs });
                          }}
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                          placeholder="Amount"
                        />
                        <input 
                          type="text" 
                          value={ing.unit}
                          onChange={e => {
                            const newIngs = [...mealForm.ingredients];
                            newIngs[idx].unit = e.target.value;
                            setMealForm({ ...mealForm, ingredients: newIngs });
                          }}
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                          placeholder="Unit"
                        />
                        <button 
                          onClick={() => {
                            const newIngs = mealForm.ingredients.filter((_, i) => i !== idx);
                            setMealForm({ ...mealForm, ingredients: newIngs });
                          }}
                          className="p-2 text-secondary hover:bg-secondary/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  {isEditingMeal && (
                    <button 
                      onClick={() => handleDeleteMeal(editingMeal!.id)}
                      className="p-4 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                  <button 
                    onClick={handleSaveMeal}
                    className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Save Meal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(isEditingDebt || isAddingDebt) && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-700 tracking-tight">
                  {isAddingDebt ? 'Add New Debt' : `Edit ${editingDebt?.name}`}
                </h2>
                <button 
                  onClick={() => {
                    setIsEditingDebt(false);
                    setIsAddingDebt(false);
                    setEditingDebt(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Debt Name</label>
                    <input 
                      type="text" 
                      value={debtForm.name}
                      onChange={e => setDebtForm({ ...debtForm, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="e.g. Home Loan, Credit Card"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Interest Rate (Annual %)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={debtForm.interest_rate}
                      onChange={e => setDebtForm({ ...debtForm, interest_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Amount</label>
                    <input 
                      type="number" 
                      value={debtForm.total_amount}
                      onChange={e => setDebtForm({ ...debtForm, total_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Remaining Amount</label>
                    <input 
                      type="number" 
                      value={debtForm.remaining_amount}
                      onChange={e => setDebtForm({ ...debtForm, remaining_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Min Repayment</label>
                    <input 
                      type="number" 
                      value={debtForm.min_repayment}
                      onChange={e => setDebtForm({ ...debtForm, min_repayment: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Monthly Fee</label>
                    <input 
                      type="number" 
                      value={debtForm.monthly_fee}
                      onChange={e => setDebtForm({ ...debtForm, monthly_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Repayment Frequency</label>
                    <select 
                      value={debtForm.repayment_frequency}
                      onChange={e => setDebtForm({ ...debtForm, repayment_frequency: e.target.value as any })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium appearance-none"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (Target)</label>
                    <input 
                      type="date" 
                      value={debtForm.due_date}
                      onChange={e => setDebtForm({ ...debtForm, due_date: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bank Category/Description Match</label>
                  <input 
                    type="text" 
                    value={debtForm.category_match}
                    onChange={e => setDebtForm({ ...debtForm, category_match: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    placeholder="e.g. Mortgage, Car Loan"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">Used to automatically sync payments from your bank transactions.</p>
                </div>

                <div className="flex gap-4 mt-10">
                  {isEditingDebt && (
                    <button 
                      onClick={() => handleDeleteDebt(editingDebt!.id)}
                      className="p-4 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                  <button 
                    onClick={handleSaveDebt}
                    className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Save Debt
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(isEditingGoal || isAddingGoal) && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-700 tracking-tight">
                  {isAddingGoal ? 'Add New Goal' : `Edit ${editingGoal?.name}`}
                </h2>
                <button 
                  onClick={() => {
                    setIsEditingGoal(false);
                    setIsAddingGoal(false);
                    setEditingGoal(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Goal Name</label>
                  <input 
                    type="text" 
                    value={goalForm.name}
                    onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    placeholder="e.g. New Car, House Deposit"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Target Amount</label>
                    <input 
                      type="number" 
                      value={goalForm.target_amount}
                      onChange={e => setGoalForm({ ...goalForm, target_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Savings</label>
                    <input 
                      type="number" 
                      value={goalForm.current_amount}
                      onChange={e => setGoalForm({ ...goalForm, current_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Target Date</label>
                  <input 
                    type="date" 
                    value={goalForm.deadline}
                    onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                  />
                </div>

                {goalForm.target_amount > goalForm.current_amount && goalForm.deadline && (
                  <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Weekly Savings Needed</p>
                    <p className="text-3xl font-black text-slate-700 tracking-tighter">
                      ${(() => {
                        const remaining = goalForm.target_amount - goalForm.current_amount;
                        const weeks = differenceInWeeks(new Date(goalForm.deadline), new Date());
                        return (remaining / Math.max(1, weeks)).toFixed(2);
                      })()}
                      <span className="text-sm font-bold text-slate-400 ml-2">/ week</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-4 mt-10">
                  {isEditingGoal && (
                    <button 
                      onClick={() => handleDeleteGoal(editingGoal!.id)}
                      className="p-4 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                  <button 
                    onClick={handleSaveGoal}
                    className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingView({ onGetStarted, onLogin }: { onGetStarted: () => void, onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black text-slate-700 tracking-tight">WeeklyWealth</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={onLogin} className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Login</button>
          <button onClick={onGetStarted} className="px-6 py-3 bg-slate-700 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">The Future of Family Finance</span>
            </div>
            <h1 className="text-7xl font-black text-slate-700 leading-[1.1] tracking-tight mb-8">
              Budget weekly. <span className="text-primary">Grow wealthy.</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed mb-12 max-w-lg">
              WeeklyWealth helps you budget weekly, track spending and build financial freedom through simple habits that grow into lasting wealth
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-10 py-5 bg-primary text-white rounded-[2rem] font-bold text-lg hover:bg-primary-dark transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 group"
              >
                Get Started
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/${i + 10}/100/100`} alt="user" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-400">Joined by 2,000+ families</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Wallet className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Total Balance</p>
                    <p className="text-xl font-black text-slate-700">$12,450.00</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-50 rounded-lg" />
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Housing', amount: 450, color: 'bg-primary' },
                  { label: 'Food', amount: 120, color: 'bg-blue-400' },
                  { label: 'Transport', amount: 85, color: 'bg-orange-400' },
                ].map(item => (
                  <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                    </div>
                    <span className="font-bold text-slate-700 text-sm">${item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function AuthScreen({ mode, setMode, onLogin, onSignup }: { mode: 'login' | 'signup', setMode: any, onLogin: any, onSignup: any }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary/20 mx-auto mb-6">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-700 tracking-tight mb-2">WeeklyWealth</h1>
          <p className="text-slate-400 font-medium">Gentle family budgeting for everyone.</p>
        </div>

        <Card className="p-10 border-none shadow-2xl shadow-slate-200/50">
          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl mb-8">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'signup' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-6">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="Your Name"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                placeholder="hello@family.com"
              />
            </div>
            <button 
              onClick={() => mode === 'login' ? onLogin(email) : onSignup(email, name)}
              className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 mt-4"
            >
              {mode === 'login' ? 'Welcome Back' : 'Start Your Journey'}
            </button>
          </div>
        </Card>

        <p className="text-center mt-8 text-slate-400 text-sm font-medium">
          {mode === 'login' ? "Don't have an account?" : "Already a member?"}
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="ml-2 text-primary font-bold hover:underline"
          >
            {mode === 'login' ? 'Create one' : 'Login here'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

// --- Sub-Views ---

function Dashboard({ 
  transactions, 
  budgets, 
  goals,
  bankAccounts,
  onViewAllTransactions,
  onAddGoal
}: { 
  transactions: Transaction[], 
  budgets: Budget[], 
  goals: Goal[],
  bankAccounts: BankAccount[],
  onViewAllTransactions: () => void,
  onAddGoal: () => void
}) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  const now = new Date();
  let filteredTransactions = transactions;
  let chartData: { name: string, amount: number }[] = [];

  if (timeframe === 'weekly') {
    const start = startOfWeek(now);
    const end = endOfWeek(now);
    filteredTransactions = transactions.filter(t => isWithinInterval(new Date(t.date), { start, end }));
    
    // Last 7 days for chart
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(now, 6 - i);
      const dayStr = format(date, 'EEE');
      const amount = transactions
        .filter(t => format(new Date(t.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
        .reduce((acc, t) => acc + t.amount, 0);
      return { name: dayStr, amount };
    });
  } else if (timeframe === 'monthly') {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    filteredTransactions = transactions.filter(t => isWithinInterval(new Date(t.date), { start, end }));
    
    // Last 4 weeks for chart
    chartData = Array.from({ length: 4 }).map((_, i) => {
      const weekStart = subDays(now, (3 - i) * 7);
      const amount = transactions
        .filter(t => {
          const d = new Date(t.date);
          return d >= subDays(weekStart, 7) && d <= weekStart;
        })
        .reduce((acc, t) => acc + t.amount, 0);
      return { name: `Week ${i + 1}`, amount };
    });
  } else {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    filteredTransactions = transactions.filter(t => isWithinInterval(new Date(t.date), { start, end }));
    
    // 12 months for chart
    chartData = Array.from({ length: 12 }).map((_, i) => {
      const monthDate = new Date(now.getFullYear(), i, 1);
      const amount = transactions
        .filter(t => new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === now.getFullYear())
        .reduce((acc, t) => acc + t.amount, 0);
      return { name: format(monthDate, 'MMM'), amount };
    });
  }

  const totalSpent = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = bankAccounts.reduce((acc, b) => acc + b.balance, 0);
  
  const totalGoalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalGoalCurrent = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const savingsPercentage = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  const categoryData = CATEGORIES.map((cat, i) => ({
    name: cat,
    value: filteredTransactions.filter(t => t.category === cat).reduce((acc, t) => acc + t.amount, 0)
  })).filter(c => c.value > 0);

  // Fallback if no data for pie chart
  const displayCategoryData = categoryData.length > 0 ? categoryData : [{ name: 'No Data', value: 1 }];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Financial Overview</h1>
          <p className="text-slate-400 font-medium">Welcome back! Here's your family's status.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setTimeframe('weekly')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${timeframe === 'weekly' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Weekly
          </button>
          <button 
            onClick={() => setTimeframe('monthly')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${timeframe === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setTimeframe('yearly')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${timeframe === 'yearly' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Yearly
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-white border-none shadow-lg shadow-primary/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-widest">Safe</span>
          </div>
          <p className="text-white/70 text-sm font-semibold">Total Balance</p>
          <h2 className="text-3xl font-bold mt-1 tracking-tight">${totalBalance.toLocaleString()}</h2>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-secondary/10 rounded-xl">
              <ArrowUpRight className="w-6 h-6 text-secondary" />
            </div>
            <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
              {timeframe}
            </span>
          </div>
          <p className="text-slate-400 text-sm font-semibold">Total Spending</p>
          <h2 className="text-3xl font-bold mt-1 text-slate-700 tracking-tight">${totalSpent.toLocaleString()}</h2>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-info/10 rounded-xl">
              <Target className="w-6 h-6 text-info" />
            </div>
            <span className="text-[10px] font-bold text-info bg-info/10 px-2.5 py-1 rounded-full uppercase tracking-widest">{savingsPercentage}% of Target</span>
          </div>
          <p className="text-slate-400 text-sm font-semibold">Total Savings</p>
          <h2 className="text-3xl font-bold mt-1 text-slate-700 tracking-tight">${totalGoalCurrent.toLocaleString()}</h2>
          <div className="mt-4">
            <ProgressBar current={totalGoalCurrent} target={totalGoalTarget} color="bg-info" />
            <p className="text-[10px] text-slate-400 mt-2 font-medium">Target: ${totalGoalTarget.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-[400px]">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Spending Trend
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{timeframe} View</span>
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)' }}
              />
              <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-[400px]">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-secondary" />
            Expense Categories
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={displayCategoryData}
                innerRadius={80}
                outerRadius={110}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {displayCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'No Data' ? '#f1f5f9' : COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-700">Bank Accounts</h3>
          </div>
          <div className="space-y-4">
            {bankAccounts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No accounts connected.</p>
            ) : (
              bankAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-all border border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{acc.name}</p>
                      <p className="text-xs text-slate-400">{acc.type}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-700">${acc.balance.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-700">Recent Transactions</h3>
            <button 
              onClick={onViewAllTransactions}
              className="text-primary text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">{t.description}</p>
                    <p className="text-xs text-slate-400 font-medium">{t.category} • {format(new Date(t.date), 'MMM d')}</p>
                  </div>
                </div>
                <p className="font-bold text-slate-700">-${t.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-700">Savings Goals</h3>
            <button 
              onClick={onAddGoal}
              className="text-primary text-sm font-bold hover:underline"
            >
              Add Goal
            </button>
          </div>
          <div className="space-y-8">
            {goals.map((goal) => (
              <div key={goal.id}>
                <div className="flex justify-between items-end mb-2.5">
                  <div>
                    <p className="font-bold text-slate-700">{goal.name}</p>
                    <p className="text-xs text-slate-400 font-medium">Target: ${goal.target_amount.toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">${goal.current_amount.toLocaleString()}</p>
                </div>
                <ProgressBar current={goal.current_amount} target={goal.target_amount} color="bg-primary" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TransactionsView({ transactions, setTransactions, user, onSync }: { transactions: Transaction[], setTransactions: any, user: User | null, onSync?: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', description: '', category: 'Food' });

  const handleAdd = async () => {
    if (!user) return;
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      amount: parseFloat(newTx.amount),
      description: newTx.description,
      category: newTx.category,
      date: new Date().toISOString(),
      source: 'manual',
      family_id: user.family_id,
      status: 'confirmed'
    };

    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });

    setTransactions([tx, ...transactions]);
    setIsAdding(false);
    setNewTx({ amount: '', description: '', category: 'Food' });
  };

  // Group transactions by week
  const groupedTransactions = transactions.reduce((groups: { [key: string]: Transaction[] }, tx) => {
    const weekStart = startOfWeek(new Date(tx.date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    if (!groups[weekKey]) {
      groups[weekKey] = [];
    }
    groups[weekKey].push(tx);
    return groups;
  }, {});

  const sortedWeekKeys = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Transactions</h1>
          <p className="text-slate-400 font-medium">Manage your family's daily spending.</p>
        </div>
        <div className="flex gap-3">
          {user?.bank_connected && (
            <button 
              onClick={onSync}
              className="flex items-center gap-2 bg-white border border-slate-100 text-slate-600 px-5 py-2.5 rounded-2xl font-bold transition-all shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="w-5 h-5 text-primary" />
              Sync Bank
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Add New
          </button>
        </div>
      </header>

      <div className="space-y-10">
        {sortedWeekKeys.map(weekKey => {
          const weekStart = new Date(weekKey);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekTxs = groupedTransactions[weekKey];
          const weekTotal = weekTxs.reduce((sum, t) => sum + t.amount, 0);

          return (
            <div key={weekKey} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">
                      {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {weekTxs.length} Transactions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Weekly Total</p>
                  <p className="text-lg font-black text-slate-700">-${weekTotal.toFixed(2)}</p>
                </div>
              </div>

              <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100/50">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {weekTxs.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 text-sm text-slate-500 font-medium">{format(new Date(t.date), 'EEE, MMM d')}</td>
                          <td className="px-8 py-5 font-bold text-slate-700">{t.description}</td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">{t.category}</span>
                          </td>
                          <td className="px-8 py-5 font-bold text-slate-700">-${t.amount.toFixed(2)}</td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.source === 'bank' ? 'bg-info/10 text-info' : 'bg-accent/10 text-accent'}`}>
                              {t.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        })}

        {transactions.length === 0 && (
          <Card className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Receipt className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Transactions Yet</h3>
            <p className="text-slate-400 max-w-xs">Start tracking your family's spending by adding your first transaction.</p>
          </Card>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <h2 className="text-2xl font-bold text-slate-700 mb-8 tracking-tight">Add Transaction</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <input 
                    type="text" 
                    value={newTx.description}
                    onChange={e => setNewTx({...newTx, description: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    placeholder="e.g. Weekly Groceries"
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Amount</label>
                    <input 
                      type="number" 
                      value={newTx.amount}
                      onChange={e => setNewTx({...newTx, amount: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      value={newTx.category}
                      onChange={e => setNewTx({...newTx, category: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium appearance-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-10">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAdd}
                    className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BudgetsView({ budgets, setBudgets, transactions, setTransactions, family, setFamily }: { budgets: Budget[], setBudgets: any, transactions: Transaction[], setTransactions: any, family: Family | null, setFamily: any }) {
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current');
  const [isEditingBudget, setIsEditingBudget] = useState<Budget | null>(null);
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'transactions'>('details');
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(family?.weekly_income?.toString() || '0');

  // Modal State
  const [modalCategory, setModalCategory] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalColor, setModalColor] = useState(COLORS[0]);

  useEffect(() => {
    if (isEditingBudget) {
      setModalCategory(isEditingBudget.category);
      setModalAmount(isEditingBudget.limit_amount.toString());
      setModalColor(isEditingBudget.color || COLORS[0]);
      setModalTab('details');
    } else if (isAddingBudget) {
      setModalCategory('');
      setModalAmount('');
      setModalColor(COLORS[0]);
      setModalTab('details');
    }
  }, [isEditingBudget, isAddingBudget]);

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const nextWeekStart = subDays(currentWeekStart, -7);
  
  const activeWeekStart = selectedWeek === 'current' ? currentWeekStart : nextWeekStart;
  const activeWeekKey = format(activeWeekStart, 'yyyy-MM-dd');

  const weekBudgets = budgets.filter(b => b.week_start === activeWeekKey);
  const totalAllocated = weekBudgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const remainingIncome = (family?.weekly_income || 0) - totalAllocated;

  const generateTips = async () => {
    setIsGeneratingTips(true);
    try {
      const prompt = `As a financial advisor, give 3 short, actionable savings tips for a family with a weekly income of $${family?.weekly_income} and the following weekly budget: ${weekBudgets.map(b => `${b.category}: $${b.limit_amount}`).join(', ')}. Format as a simple list of 3 items.`;
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = result.text || "";
      const tips = text.split('\n').filter(t => t.trim().length > 0).slice(0, 3);
      setAiTips(tips);
    } catch (e) {
      console.error("AI Tips failed", e);
      setAiTips(["Try reducing dining out this week.", "Check for unused subscriptions.", "Look for generic brand alternatives at the grocery store."]);
    } finally {
      setIsGeneratingTips(false);
    }
  };

  useEffect(() => {
    if (family?.weekly_income && weekBudgets.length > 0 && aiTips.length === 0) {
      generateTips();
    }
  }, [family?.weekly_income, activeWeekKey]);

  const handleSaveIncome = async () => {
    if (!family) return;
    const income = parseFloat(tempIncome);
    await fetch('/api/families/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId: family.id, income })
    });
    setFamily({ ...family, weekly_income: income });
    setIsEditingIncome(false);
  };

  const handleSaveBudget = async () => {
    if (!family) return;
    const budgetId = isEditingBudget?.id || Math.random().toString(36).substr(2, 9);
    const newBudget = {
      id: budgetId,
      family_id: family.id,
      category: modalCategory || 'New Category',
      limit_amount: parseFloat(modalAmount) || 0,
      period: 'weekly' as const,
      color: modalColor,
      week_start: activeWeekKey
    };

    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBudget)
    });

    if (isEditingBudget) {
      setBudgets(budgets.map(b => b.id === isEditingBudget.id ? newBudget : b));
    } else {
      setBudgets([...budgets, newBudget]);
    }
    setIsEditingBudget(null);
    setIsAddingBudget(false);
  };

  const handleDeleteBudget = async (id: string) => {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    setBudgets(budgets.filter(b => b.id !== id));
    setIsEditingBudget(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Weekly Budget</h1>
          <p className="text-slate-400 font-medium">Allocate your income and stay ahead.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setSelectedWeek('current')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedWeek === 'current' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Current Week
          </button>
          <button 
            onClick={() => setSelectedWeek('next')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedWeek === 'next' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Next Week
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Income Card */}
          <Card className="bg-slate-900 text-white border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Weekly Income</p>
                  {isEditingIncome ? (
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={tempIncome}
                        onChange={e => setTempIncome(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-2xl font-bold outline-none focus:ring-2 focus:ring-primary w-40"
                      />
                      <button onClick={handleSaveIncome} className="bg-primary p-2 rounded-xl hover:bg-primary-dark transition-colors">
                        <ShieldCheck className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-4xl font-black tracking-tight">${family?.weekly_income?.toFixed(2) || '0.00'}</h2>
                      <button onClick={() => setIsEditingIncome(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <Settings className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Remaining</p>
                  <h3 className={`text-2xl font-bold ${remainingIncome < 0 ? 'text-secondary' : 'text-success'}`}>
                    ${remainingIncome.toFixed(2)}
                  </h3>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>Allocated</span>
                  <span>{((totalAllocated / (family?.weekly_income || 1)) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalAllocated / (family?.weekly_income || 1)) * 100)}%` }}
                    className={`h-full ${remainingIncome < 0 ? 'bg-secondary' : 'bg-primary'}`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Budgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weekBudgets.map(budget => {
              const spent = transactions
                .filter(t => t.category === budget.category && isWithinInterval(new Date(t.date), { start: activeWeekStart, end: endOfWeek(activeWeekStart, { weekStartsOn: 1 }) }))
                .reduce((acc, t) => acc + t.amount, 0);
              const isOver = spent > budget.limit_amount;

              return (
                <Card 
                  key={budget.id} 
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4"
                  style={{ borderLeftColor: budget.color }}
                  onClick={() => setIsEditingBudget(budget)}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-slate-700">{budget.category}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Limit: ${budget.limit_amount}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/10 transition-colors">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                    </div>
                  </div>
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-sm text-slate-400 font-medium">Spent: <span className="font-bold text-slate-700">${spent.toFixed(2)}</span></p>
                    <p className="text-xs font-bold text-slate-400">{((spent / budget.limit_amount) * 100).toFixed(0)}%</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (spent / budget.limit_amount) * 100)}%` }}
                      className="h-full"
                      style={{ backgroundColor: budget.color }}
                    />
                  </div>
                  {isOver && (
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-3 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Over by ${(spent - budget.limit_amount).toFixed(2)}
                    </p>
                  )}
                </Card>
              );
            })}

            {/* Uncategorized Transactions Card */}
            {(() => {
              const uncategorizedTxs = transactions.filter(t => 
                (t.category === 'Uncategorized' || !weekBudgets.some(b => b.category === t.category)) && 
                isWithinInterval(new Date(t.date), { start: activeWeekStart, end: endOfWeek(activeWeekStart, { weekStartsOn: 1 }) })
              );
              const uncategorizedTotal = uncategorizedTxs.reduce((sum, t) => sum + t.amount, 0);
              
              if (uncategorizedTxs.length > 0) {
                return (
                  <Card 
                    className="bg-slate-50 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 transition-all"
                    onClick={() => {
                      setIsEditingBudget({
                        id: 'uncategorized',
                        category: 'Uncategorized',
                        limit_amount: 0,
                        week_start: activeWeekKey,
                        family_id: family?.id || '',
                        period: 'weekly',
                        color: '#94a3b8'
                      });
                      setModalTab('transactions');
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-slate-500">Uncategorized</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uncategorizedTxs.length} Transactions</p>
                      </div>
                      <AlertCircle className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-2xl font-black text-slate-400">${uncategorizedTotal.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-4">Assign to Budget →</p>
                  </Card>
                );
              }
              return null;
            })()}

            <button 
              onClick={() => setIsAddingBudget(true)}
              className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest">Add Category</span>
            </button>
          </div>
        </div>

        {/* Sidebar: AI Tips */}
        <div className="space-y-8">
          <Card className="bg-primary/5 border-primary/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                AI Savings Tips
              </h3>
              <button 
                onClick={generateTips}
                disabled={isGeneratingTips}
                className="p-2 hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-primary ${isGeneratingTips ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-4">
              {isGeneratingTips ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-white/50 animate-pulse rounded-2xl" />
                ))
              ) : aiTips.length > 0 ? (
                aiTips.map((tip, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-primary/5 flex gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-xs">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{tip.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4 italic">No tips generated yet. Add some budgets to get started!</p>
              )}
            </div>
          </Card>

          <Card className="bg-primary text-white border-none shadow-lg shadow-primary/20">
            <h3 className="font-bold mb-4">Pro Tip</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Allocating your income for next week today helps you visualize your financial future and reduces impulse spending.
            </p>
            <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-white/90 transition-all">
              Learn More
            </button>
          </Card>
        </div>
      </div>

      {/* Edit/Add Budget Modal */}
      <AnimatePresence>
        {(isEditingBudget || isAddingBudget) && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-700 tracking-tight">
                  {isAddingBudget ? 'Add Category' : `Manage ${isEditingBudget?.category}`}
                </h2>
                {!isAddingBudget && (
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setModalTab('details')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modalTab === 'details' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => setModalTab('transactions')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modalTab === 'transactions' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                    >
                      Transactions
                    </button>
                  </div>
                )}
              </div>

              {modalTab === 'details' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category Name</label>
                      <input 
                        type="text" 
                        value={modalCategory}
                        onChange={e => setModalCategory(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        placeholder="e.g. Groceries"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Weekly Limit</label>
                      <input 
                        type="number" 
                        value={modalAmount}
                        onChange={e => setModalAmount(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Color Tag</label>
                    <div className="flex flex-wrap gap-3">
                      {COLORS.map(color => (
                        <button 
                          key={color}
                          onClick={() => setModalColor(color)}
                          className={`w-10 h-10 rounded-xl transition-all ${modalColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-10">
                    {!isAddingBudget && (
                      <button 
                        onClick={() => handleDeleteBudget(isEditingBudget!.id)}
                        className="p-4 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-2xl transition-all"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setIsEditingBudget(null);
                        setIsAddingBudget(false);
                      }}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveBudget}
                      className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Spent this week</p>
                    <p className="text-2xl font-black text-slate-700">
                      ${transactions
                        .filter(t => t.category === isEditingBudget?.category && isWithinInterval(new Date(t.date), { start: activeWeekStart, end: endOfWeek(activeWeekStart, { weekStartsOn: 1 }) }))
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {transactions
                      .filter(t => {
                        if (isEditingBudget?.id === 'uncategorized') {
                          return (t.category === 'Uncategorized' || !weekBudgets.some(b => b.category === t.category)) && 
                                 isWithinInterval(new Date(t.date), { start: activeWeekStart, end: endOfWeek(activeWeekStart, { weekStartsOn: 1 }) });
                        }
                        return t.category === isEditingBudget?.category && 
                               isWithinInterval(new Date(t.date), { start: activeWeekStart, end: endOfWeek(activeWeekStart, { weekStartsOn: 1 }) });
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(t => (
                        <div key={t.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-bold text-slate-700">{t.description}</p>
                              <p className="text-xs text-slate-400 font-medium">{format(new Date(t.date), 'EEE, MMM d')}</p>
                            </div>
                            <p className="font-bold text-slate-700">-${t.amount.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Category:</span>
                            <select 
                              value={t.category}
                              onChange={async (e) => {
                                const newCat = e.target.value;
                                await fetch('/api/transactions/categorize', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ transactionId: t.id, category: newCat })
                                });
                                setTransactions(transactions.map(item => item.id === t.id ? { ...item, category: newCat, status: 'confirmed' } : item));
                              }}
                              className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-lg outline-none border-none cursor-pointer hover:bg-primary/10 transition-colors"
                            >
                              <option value="Uncategorized">Uncategorized</option>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    {transactions.filter(t => t.category === isEditingBudget?.category && isWithinInterval(new Date(t.date), { start: activeWeekStart, end: endOfWeek(activeWeekStart, { weekStartsOn: 1 }) })).length === 0 && (
                      <div className="py-10 text-center">
                        <p className="text-slate-400 font-medium">No transactions found for this category this week.</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setIsEditingBudget(null);
                      setIsAddingBudget(false);
                    }}
                    className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-bold transition-all mt-6"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalsView({ 
  goals, 
  onAddGoal, 
  onEditGoal, 
  onAddSavings,
  savingsAmount,
  setSavingsAmount
}: { 
  goals: Goal[], 
  onAddGoal: () => void, 
  onEditGoal: (goal: Goal) => void,
  onAddSavings: (goalId: string) => void,
  savingsAmount: { [key: string]: string },
  setSavingsAmount: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>
}) {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Savings Goals</h1>
          <p className="text-slate-400 font-medium">Dream big, save smart.</p>
        </div>
        <button 
          onClick={onAddGoal}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Goal
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {goals.map(goal => {
          const remaining = goal.target_amount - goal.current_amount;
          const weeks = differenceInWeeks(new Date(goal.deadline), new Date());
          const weeklyNeeded = remaining > 0 ? (remaining / Math.max(1, weeks)) : 0;

          return (
            <Card key={goal.id} className="relative overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                  <Target className="w-10 h-10 text-primary" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-1">Target Date</p>
                  <p className="font-bold text-slate-700">{format(new Date(goal.deadline), 'MMM yyyy')}</p>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-700 mb-3 tracking-tight">{goal.name}</h3>
                <div className="flex justify-between items-end mb-4">
                  <p className="text-4xl font-black text-primary tracking-tighter">${goal.current_amount.toLocaleString()}</p>
                  <p className="text-slate-300 font-bold text-sm">of ${goal.target_amount.toLocaleString()}</p>
                </div>
                <ProgressBar current={goal.current_amount} target={goal.target_amount} />
                
                {remaining > 0 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weekly Needed</p>
                        <p className="text-lg font-black text-slate-700">${weeklyNeeded.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weeks Left</p>
                        <p className="text-lg font-black text-slate-700">{Math.max(0, weeks)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" 
                      value={savingsAmount[goal.id] || ''}
                      onChange={e => setSavingsAmount(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder="Amount"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                    />
                  </div>
                  <button 
                    onClick={() => onAddSavings(goal.id)}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50"
                    disabled={!savingsAmount[goal.id] || parseFloat(savingsAmount[goal.id]) <= 0}
                  >
                    Save
                  </button>
                </div>
                <button 
                  onClick={() => onEditGoal(goal)}
                  className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Edit Goal Details
                </button>
              </div>
            </Card>
          );
        })}
        
        {goals.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Target className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No goals set yet</h3>
            <p className="text-slate-400 max-w-xs mx-auto mb-8">Start your savings journey by setting your first financial goal.</p>
            <button 
              onClick={onAddGoal}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              Set Your First Goal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DebtsView({ 
  debts, 
  transactions,
  onAddDebt,
  onEditDebt
}: { 
  debts: Debt[], 
  transactions: Transaction[],
  onAddDebt: () => void,
  onEditDebt: (debt: Debt) => void
}) {
  const [extraPayments, setExtraPayments] = useState<{ [key: string]: string }>({});

  const calculatePayoff = (debt: Debt, extraWeekly: number) => {
    const balance = debt.remaining_amount;
    const annualRate = debt.interest_rate / 100;
    const monthlyRate = annualRate / 12;
    const monthlyFee = debt.monthly_fee;
    
    // Convert everything to monthly for calculation
    let monthlyPayment = 0;
    if (debt.repayment_frequency === 'weekly') monthlyPayment = debt.min_repayment * 4.33;
    else if (debt.repayment_frequency === 'fortnightly') monthlyPayment = debt.min_repayment * 2.16;
    else monthlyPayment = debt.min_repayment;

    const totalMonthlyPayment = monthlyPayment + (extraWeekly * 4.33);
    
    if (totalMonthlyPayment <= (balance * monthlyRate) + monthlyFee) {
      return { months: Infinity, totalInterest: Infinity };
    }

    let currentBalance = balance;
    let months = 0;
    let totalInterest = 0;

    while (currentBalance > 0 && months < 600) { // Cap at 50 years
      const interest = currentBalance * monthlyRate;
      totalInterest += interest;
      currentBalance = currentBalance + interest + monthlyFee - totalMonthlyPayment;
      months++;
    }

    return { months, totalInterest };
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Debt Tracker</h1>
          <p className="text-slate-400 font-medium">Strategy to become debt-free.</p>
        </div>
        <button 
          onClick={onAddDebt}
          className="bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-secondary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Debt
        </button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {debts.map(debt => {
          const extra = parseFloat(extraPayments[debt.id] || '0');
          const currentPayoff = calculatePayoff(debt, 0);
          const newPayoff = calculatePayoff(debt, extra);
          
          const monthsSaved = currentPayoff.months - newPayoff.months;
          const interestSaved = currentPayoff.totalInterest - newPayoff.totalInterest;

          // Find linked transactions
          const linkedTxs = transactions.filter(t => 
            debt.category_match && 
            (t.category.toLowerCase().includes(debt.category_match.toLowerCase()) || 
             t.description.toLowerCase().includes(debt.category_match.toLowerCase()))
          ).slice(0, 3);

          return (
            <Card key={debt.id} className="relative overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 bg-secondary/10 rounded-[1.5rem]">
                  <CreditCard className="w-10 h-10 text-secondary" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-1">Interest Rate</p>
                  <p className="font-bold text-slate-700">{debt.interest_rate}% p.a.</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-slate-700 tracking-tight">{debt.name}</h3>
                  <button 
                    onClick={() => onEditDebt(debt)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Settings className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remaining Balance</p>
                    <p className="text-3xl font-black text-slate-700 tracking-tighter">${debt.remaining_amount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Min Repayment</p>
                    <p className="text-xl font-bold text-slate-700">${debt.min_repayment} <span className="text-xs text-slate-400">/{debt.repayment_frequency}</span></p>
                  </div>
                </div>

                <ProgressBar current={debt.total_amount - debt.remaining_amount} target={debt.total_amount} color="bg-secondary" />
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payoff Calculator */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Payoff Calculator</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Extra Weekly Payment</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input 
                            type="number" 
                            value={extraPayments[debt.id] || ''}
                            onChange={e => setExtraPayments(prev => ({ ...prev, [debt.id]: e.target.value }))}
                            className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all text-sm font-bold"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      {extra > 0 && newPayoff.months !== Infinity && (
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">Time Saved:</span>
                            <span className="text-xs font-bold text-success">{Math.floor(monthsSaved / 12)}y {monthsSaved % 12}m</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">Interest Saved:</span>
                            <span className="text-xs font-bold text-success">${interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-xs text-slate-500 font-medium">New Payoff:</span>
                            <span className="text-xs font-bold text-slate-700">{Math.floor(newPayoff.months / 12)}y {newPayoff.months % 12}m</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Sync */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bank Sync</h4>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-success uppercase">Live</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {linkedTxs.length > 0 ? (
                        linkedTxs.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <div>
                              <p className="text-xs font-bold text-slate-700 truncate w-32">{t.description}</p>
                              <p className="text-[10px] text-slate-400">{format(new Date(t.date), 'MMM d')}</p>
                            </div>
                            <p className="text-xs font-bold text-success">-${t.amount.toFixed(2)}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-[10px] text-slate-400 italic">No matching transactions found.</p>
                          <p className="text-[10px] text-slate-300 mt-1">Check your match keyword in settings.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {debts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CreditCard className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No debts tracked yet</h3>
            <p className="text-slate-400 max-w-xs mx-auto mb-8">Add your loans or credit cards to start your journey to financial freedom.</p>
            <button 
              onClick={onAddDebt}
              className="bg-secondary text-white px-8 py-4 rounded-2xl font-bold hover:bg-secondary-dark transition-all shadow-lg shadow-secondary/20"
            >
              Add Your First Debt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MealPlannerView({ 
  mealPlans, 
  onAddMeal,
  onEditMeal
}: { 
  mealPlans: MealPlan[], 
  onAddMeal: (date?: string) => void,
  onEditMeal: (meal: MealPlan) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 for current week, 1 for next week
  const [aiIdeas, setAiIdeas] = useState<{name: string, description: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const startOfSelectedWeek = startOfWeek(subDays(new Date(), -weekOffset * 7), { weekStartsOn: 1 });
  const endOfSelectedWeek = endOfWeek(startOfSelectedWeek, { weekStartsOn: 1 });
  
  const currentWeekPlans = mealPlans.filter(p => 
    isWithinInterval(new Date(p.date), { start: startOfSelectedWeek, end: endOfSelectedWeek })
  );

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const shoppingList = currentWeekPlans.reduce((acc, plan) => {
    (plan.ingredients || []).forEach(ing => {
      const existing = acc.find(i => i.name.toLowerCase() === ing.name.toLowerCase());
      if (existing) {
        const currentAmount = parseFloat(existing.amount) || 0;
        const addAmount = parseFloat(ing.amount) || 0;
        existing.amount = (currentAmount + addAmount).toString();
      } else {
        acc.push({ ...ing });
      }
    });
    return acc;
  }, [] as Ingredient[]);

  const handleCopyList = () => {
    const text = shoppingList.map(i => `${i.amount} ${i.unit} ${i.name}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Shopping list copied to clipboard!');
  };

  const toggleCheck = (name: string) => {
    setCheckedItems(prev => 
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  if (isShoppingMode) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <header className="flex items-center justify-between">
          <button 
            onClick={() => setIsShoppingMode(false)}
            className="text-primary font-bold flex items-center gap-2"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Planner
          </button>
          <h1 className="text-xl font-bold text-slate-700">Shopping Mode</h1>
        </header>

        <Card className="p-0 overflow-hidden rounded-3xl">
          <div className="bg-primary p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Current Progress</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black">{checkedItems.length} / {shoppingList.length}</p>
              <p className="text-sm font-bold">{Math.round((checkedItems.length / (shoppingList.length || 1)) * 100)}%</p>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500" 
                style={{ width: `${(checkedItems.length / (shoppingList.length || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="p-6 space-y-2">
            {shoppingList.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => toggleCheck(item.name)}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${checkedItems.includes(item.name) ? 'bg-slate-50 opacity-50' : 'bg-white border border-slate-100 shadow-sm'}`}
              >
                {checkedItems.includes(item.name) ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-200" />
                )}
                <div className="flex-1">
                  <p className={`font-bold text-slate-700 ${checkedItems.includes(item.name) ? 'line-through' : ''}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-400">{item.amount} {item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Meal Planner</h1>
          <p className="text-slate-400 font-medium">Plan healthy meals and save on groceries.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsShoppingMode(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            <Smartphone className="w-5 h-5" />
            Shopping Mode
          </button>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setWeekOffset(0)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${weekOffset === 0 ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Week 1
            </button>
            <button 
              onClick={() => setWeekOffset(1)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${weekOffset === 1 ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Week 2
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View */}
        <div className="lg:col-span-2 space-y-4">
          {days.map((day, idx) => {
            const date = format(subDays(startOfSelectedWeek, -idx), 'yyyy-MM-dd');
            const dayPlans = currentWeekPlans.filter(p => p.date === date);

            return (
              <Card key={day} className="p-6 hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-slate-700">{day}</h3>
                    <p className="text-xs text-slate-400">{format(new Date(date), 'MMMM do')}</p>
                  </div>
                  <button 
                    onClick={() => onAddMeal(date)}
                    className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {dayPlans.length > 0 ? (
                    dayPlans.map(plan => (
                      <div 
                        key={plan.id} 
                        onClick={() => onEditMeal(plan)}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Utensils className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{plan.meal_type}</p>
                            <p className="font-bold text-slate-700">{plan.recipe_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {plan.recipe_url && (
                            <ExternalLink className="w-4 h-4 text-slate-300" />
                          )}
                          <p className="text-xs font-bold text-slate-400">
                            {plan.ingredients?.length || 0} items
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-300 italic py-2">No meals planned for this day.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Sidebar: Shopping List & AI Ideas */}
        <div className="space-y-8">
          {/* Shopping List */}
          <Card className="sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Shopping List
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyList}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  title="Copy List"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {shoppingList.length > 0 && (
                  <a 
                    href={`https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(shoppingList.map(i => i.name).join(' '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors"
                    title="Bulk Search on Woolies"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {shoppingList.length > 0 ? (
                shoppingList.map((item, idx) => {
                  return (
                    <div key={idx} className="pb-4 border-b border-slate-50 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.amount} {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={`https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(item.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 hover:text-primary transition-colors"
                            title="Find on Woolies"
                          >
                            W
                          </a>
                          <a 
                            href={`https://www.coles.com.au/search?q=${encodeURIComponent(item.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 hover:text-secondary transition-colors"
                            title="Find on Coles"
                          >
                            C
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">Your shopping list is empty.</p>
                  <p className="text-xs text-slate-300 mt-1">Add meals to generate a list.</p>
                </div>
              )}
            </div>
          </Card>

          {/* AI Ideas */}
          <Card className="bg-primary/5 border-primary/10">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Dinner Ideas
            </h3>
            <div className="space-y-4">
              <button 
                className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                onClick={async () => {
                  setIsGenerating(true);
                  // In a real app, we'd call the parent's handleGenerateAIIdeas
                  // For now, let's just show some static ideas or wait
                  setTimeout(() => {
                    setAiIdeas([
                      { name: 'Honey Soy Salmon', description: 'Quick and healthy with steamed greens.' },
                      { name: 'Zucchini Fritters', description: 'Light vegetarian option for busy nights.' },
                      { name: 'Lemon Herb Chicken', description: 'Classic family favorite with roast potatoes.' }
                    ]);
                    setIsGenerating(false);
                  }, 1500);
                }}
                disabled={isGenerating}
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : 'Get New Ideas'}
              </button>
              
              <div className="space-y-3">
                {aiIdeas.map((idea, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-primary/10">
                    <p className="font-bold text-slate-700 text-sm">{idea.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{idea.description}</p>
                    <button 
                      onClick={() => onAddMeal()}
                      className="text-[10px] font-bold text-primary mt-2 hover:underline"
                    >
                      + Add to Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FamilyView({ 
  user, 
  familyMembers, 
  onConnectBank, 
  onDisconnectBank, 
  isConnecting,
  onInviteMember
}: { 
  user: User | null, 
  familyMembers: User[],
  onConnectBank?: any, 
  onDisconnectBank?: any, 
  isConnecting?: boolean,
  onInviteMember: (email: string, name: string) => Promise<void>
}) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '' });
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      await onInviteMember(inviteForm.email, inviteForm.name);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', name: '' });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Family Management</h1>
        <p className="text-slate-400 font-medium">Manage members and shared permissions.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <h3 className="font-bold text-slate-700 mb-8">Family Members</h3>
          <div className="space-y-5">
            {familyMembers.length > 0 ? familyMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-[1.5rem] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">{member.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{member.email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                  {member.role}
                </span>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-slate-400 font-medium">No family members found.</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full mt-8 py-4 border-2 border-dashed border-slate-100 hover:border-primary hover:text-primary rounded-[1.5rem] font-bold text-slate-300 transition-all"
          >
            Invite Family Member
          </button>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-700 mb-8">Bank Connections</h3>
          <div className="space-y-5">
            {user?.bank_connected ? (
              <div className="p-5 bg-info/5 rounded-[1.5rem] border border-info/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <CreditCard className="text-info w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Commonwealth Bank</p>
                    <p className="text-[10px] text-info font-black uppercase tracking-widest">Synced Just Now</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    onDisconnectBank();
                  }}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                  title="Disconnect Bank"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={onConnectBank}
                disabled={isConnecting}
                className="w-full py-5 bg-slate-700 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {isConnecting ? 'Connecting to Basiq...' : 'Connect with Basiq'}
              </button>
            )}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <UserPlus className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-700 tracking-tight">Invite Member</h2>
                  <p className="text-slate-400 font-medium text-sm">Add someone to your family budget.</p>
                </div>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={inviteForm.name}
                    onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isInviting}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isInviting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Send Invite'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsView({ user, onUpdateUser }: { user: User | null, onUpdateUser: (user: User) => void }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [payAmount, setPayAmount] = useState(user?.pay_amount || 0);
  const [payFrequency, setPayFrequency] = useState(user?.pay_frequency || 'monthly');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name,
          email,
          payAmount,
          payFrequency
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        onUpdateUser(updatedUser);
      }
    } catch (e) {
      console.error("Failed to save settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-700 tracking-tight">Settings</h1>
        <p className="text-slate-400 font-medium">Manage your account and preferences.</p>
      </header>

      <div className="max-w-2xl space-y-8">
        <Card className="border-none shadow-xl shadow-slate-200/50">
          <h3 className="font-bold text-slate-700 mb-8">Subscription</h3>
          <div className="p-8 bg-slate-700 rounded-[2rem] text-white relative overflow-hidden shadow-lg shadow-slate-200">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <ShieldCheck className="text-primary w-8 h-8" />
                <span className="font-bold text-2xl tracking-tight">WeeklyWealth Pro</span>
              </div>
              <p className="text-slate-300 mb-8 leading-relaxed font-medium">You are currently on the Annual Plan ($100/year). Your next billing date is March 15, 2027.</p>
              <div className="flex gap-4">
                <button className="px-8 py-3 bg-primary hover:bg-primary-dark rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary/20">Change Plan</button>
                <button className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all">Cancel</button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full -mr-24 -mt-24 blur-3xl" />
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-700 mb-8">Pay Settings</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Pay Amount (Net)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={payAmount} 
                    onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Pay Frequency</label>
                <select 
                  value={payFrequency}
                  onChange={e => setPayFrequency(e.target.value as any)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium h-[54px]"
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-700 mb-8">Profile Settings</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Display Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium" 
              />
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 mt-4 flex items-center justify-center gap-2"
            >
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function OnboardingView({ user, onComplete }: { user: User, onComplete: (user: User) => void }) {
  const [step, setStep] = useState(1);
  const [payAmount, setPayAmount] = useState(0);
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('monthly');
  const [spendingHabits, setSpendingHabits] = useState('');
  const [bankAccounts, setBankAccounts] = useState([{ name: 'Main Account', balance: 0, type: 'Checking' }]);
  const [debts, setDebts] = useState<{ name: string, amount: number, interestRate: number, minRepayment: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccount = () => {
    setBankAccounts([...bankAccounts, { name: '', balance: 0, type: 'Savings' }]);
  };

  const handleAddDebt = () => {
    setDebts([...debts, { name: '', amount: 0, interestRate: 0, minRepayment: 0 }]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          familyId: user.family_id,
          payAmount,
          payFrequency,
          spendingHabits,
          bankAccounts,
          debts
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        onComplete(updatedUser);
      }
    } catch (e) {
      console.error("Onboarding failed", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Sparkles className="text-primary w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-700 tracking-tight">Welcome to WeeklyWealth</h2>
            <p className="text-slate-400 font-medium">Let's set up your financial profile.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-primary' : 'bg-slate-100'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-700">Basic Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pay Amount (Net)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pay Frequency</label>
                  <select
                    value={payFrequency}
                    onChange={e => setPayFrequency(e.target.value as any)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium h-[60px]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Spending Habits</label>
                <select
                  value={spendingHabits}
                  onChange={e => setSpendingHabits(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                >
                  <option value="">Select an option...</option>
                  <option value="frugal">Frugal (I save most of my money)</option>
                  <option value="balanced">Balanced (I spend and save equally)</option>
                  <option value="spender">Spender (I enjoy spending on experiences/items)</option>
                </select>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={payAmount <= 0 || !spendingHabits}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none mt-4"
              >
                Next Step
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-700">Bank Accounts</h3>
                <button onClick={handleAddAccount} className="text-primary font-bold text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Another
                </button>
              </div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {bankAccounts.map((acc, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Name</label>
                        <input
                          type="text"
                          value={acc.name}
                          onChange={e => {
                            const newAccs = [...bankAccounts];
                            newAccs[idx].name = e.target.value;
                            setBankAccounts(newAccs);
                          }}
                          className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                          placeholder="e.g. Savings"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance</label>
                        <input
                          type="number"
                          value={acc.balance}
                          onChange={e => {
                            const newAccs = [...bankAccounts];
                            newAccs[idx].balance = parseFloat(e.target.value) || 0;
                            setBankAccounts(newAccs);
                          }}
                          className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">Next Step</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-700">Debts (Optional)</h3>
                <button onClick={handleAddDebt} className="text-primary font-bold text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Debt
                </button>
              </div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {debts.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">No debts? That's great! Click next to continue.</p>
                  </div>
                ) : (
                  debts.map((debt, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Debt Name</label>
                          <input
                            type="text"
                            value={debt.name}
                            onChange={e => {
                              const newDebts = [...debts];
                              newDebts[idx].name = e.target.value;
                              setDebts(newDebts);
                            }}
                            className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                            placeholder="e.g. Credit Card"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount Owed</label>
                          <input
                            type="number"
                            value={debt.amount}
                            onChange={e => {
                              const newDebts = [...debts];
                              newDebts[idx].amount = parseFloat(e.target.value) || 0;
                              setDebts(newDebts);
                            }}
                            className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-4 mt-4">
                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">Back</button>
                <button onClick={() => setStep(4)} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">Next Step</button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-primary w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700">All Set!</h3>
              <p className="text-slate-500 font-medium">We've gathered enough info to start your financial journey. We'll pre-fill your budgets and goals based on your profile.</p>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Pay:</span>
                  <span className="text-slate-700 font-bold">${payAmount.toLocaleString()} ({payFrequency})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Total Bank Balance:</span>
                  <span className="text-slate-700 font-bold">${bankAccounts.reduce((acc, b) => acc + b.balance, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Total Debt:</span>
                  <span className="text-slate-700 font-bold">${debts.reduce((acc, d) => acc + d.amount, 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Get Started'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
