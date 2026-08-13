import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from "react";
import {
  Home, Wallet, Receipt, FileText, PiggyBank, CreditCard, Target, RefreshCw,
  TrendingUp, BarChart2, Settings as SettingsIcon, Menu, X, Plus, Sun, Moon,
  AlertTriangle, CheckCircle2, Trash2, Pencil, Search, ArrowUpRight,
  ArrowDownRight, ChevronRight, Sparkles, Wallet2, Info
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

/* ============================================================ UTILITIES */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => new Date().toISOString().slice(0, 10);

const CURRENCY_SYMBOLS = { ZAR: "R", USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" };

function formatMoney(value, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "";
  const num = Number(value);
  const safe = isFinite(num) ? num : 0;
  return `${sym} ${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return "No date set";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "No date set";
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function isPast(dateStr) {
  if (!dateStr) return false;
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return false;
  const startToday = new Date(new Date().toDateString());
  return dt < startToday;
}

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }

function inCurrentMonth(dateStr) {
  if (!dateStr) return false;
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return false;
  return dt >= startOfMonth() && dt <= endOfMonth();
}

const EXPENSE_CATEGORIES = [
  "Housing", "Transport", "Food & Groceries", "Debt Payments", "Savings",
  "Insurance & Health", "Personal & Lifestyle", "Subscriptions", "Other"
];
const PAYMENT_METHODS = ["Cash", "Debit Card", "Credit Card", "EFT", "Debit Order", "Other"];
const FREQUENCIES = ["Weekly", "Monthly", "Quarterly", "Annually"];
const PALETTE = ["#4f46e5", "#059669", "#d97706", "#e11d48", "#0891b2", "#7c3aed", "#65a30d", "#db2777", "#0d9488"];

function monthlyEquivalent(cost, frequency) {
  const c = Number(cost) || 0;
  switch (frequency) {
    case "Weekly": return c * 4.33;
    case "Monthly": return c;
    case "Quarterly": return c / 3;
    case "Annually": return c / 12;
    default: return c;
  }
}

function defaultData() {
  return {
    onboarded: false,
    theme: "light",
    profile: { name: "", currency: "ZAR", monthlyIncome: 0, payFrequency: "Monthly", mainGoal: "", hasDebt: false },
    settings: { notifyBills: true, notifyBudget: true },
    categories: [],
    transactions: [],
    bills: [],
    savingsGoals: [],
    debts: [],
    subscriptions: [],
    goals: [],
    netWorth: { cash: 0, savings: 0, investments: 0, property: 0, vehicles: 0, other: 0, creditCards: 0, loans: 0, otherLiabilities: 0 },
    netWorthHistory: [],
  };
}

function seedBudget(income, hasDebt) {
  const mk = (name, type, pct) => ({ id: uid(), name, type, planned: Math.round((Number(income) || 0) * pct), });
  const cats = [
    mk("Rent / Bond", "fixed", 0.25),
    mk("Insurance", "fixed", 0.05),
    mk("Groceries", "variable", 0.15),
    mk("Transport", "variable", 0.10),
    mk("Entertainment", "variable", 0.05),
    mk("Emergency Fund", "savings", 0.10),
  ];
  if (hasDebt) cats.push(mk("Debt Repayment", "debt", 0.10));
  return cats;
}

/* ============================================================ THEME */

const THEMES = {
  light: {
    bg: "bg-slate-50", surface: "bg-white", surfaceAlt: "bg-slate-50", border: "border-slate-200",
    text: "text-slate-900", subtext: "text-slate-500", faint: "text-slate-400",
    hover: "hover:bg-slate-100", active: "bg-indigo-50 text-indigo-700",
    input: "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    shadow: "shadow-sm",
  },
  dark: {
    bg: "bg-slate-950", surface: "bg-slate-900", surfaceAlt: "bg-slate-800/60", border: "border-slate-800",
    text: "text-slate-50", subtext: "text-slate-400", faint: "text-slate-500",
    hover: "hover:bg-slate-800", active: "bg-indigo-500/10 text-indigo-400",
    input: "bg-slate-800 border-slate-700 text-slate-50 placeholder-slate-500",
    shadow: "shadow-none",
  },
};

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ============================================================ PRIMITIVES */

function Card({ children, className = "", padded = true }) {
  const { c } = useApp();
  return (
    <div className={`${c.surface} border ${c.border} rounded-2xl ${c.shadow} ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", type = "button", className = "", disabled, title }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function IconButton({ icon: Icon, onClick, tone = "neutral", title }) {
  const { c } = useApp();
  const tones = {
    neutral: `${c.subtext} hover:bg-slate-500/10`,
    danger: "text-rose-500 hover:bg-rose-500/10",
  };
  return (
    <button title={title} onClick={onClick} className={`p-2 rounded-lg transition ${tones[tone]}`}>
      <Icon size={16} />
    </button>
  );
}

function Field({ label, children, hint, error }) {
  const { c } = useApp();
  return (
    <label className="block">
      <span className={`text-xs font-semibold ${c.subtext} uppercase tracking-wide`}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className={`text-xs ${c.faint} mt-1 block`}>{hint}</span>}
      {error && <span className="text-xs text-rose-500 mt-1 block">{error}</span>}
    </label>
  );
}

function Input(props) {
  const { c } = useApp();
  return <input {...props} className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${c.input} ${props.className || ""}`} />;
}
function Select({ children, ...props }) {
  const { c } = useApp();
  return <select {...props} className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${c.input}`}>{children}</select>;
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    positive: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    negative: "bg-rose-100 text-rose-700",
    neutral: "bg-slate-100 text-slate-600",
    brand: "bg-indigo-100 text-indigo-700",
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function ProgressBar({ pct, tone = "brand" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tones = { brand: "bg-indigo-600", positive: "bg-emerald-500", warning: "bg-amber-500", negative: "bg-rose-500" };
  return (
    <div className="w-full h-2 rounded-full bg-slate-500/10 overflow-hidden">
      <div className={`h-full rounded-full ${tones[tone]} transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }) {
  const { c } = useApp();
  return (
    <Card className="text-center py-12">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
        <Icon size={22} />
      </div>
      <p className={`font-semibold ${c.text}`}>{title}</p>
      <p className={`text-sm ${c.subtext} mt-1 max-w-sm mx-auto`}>{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  const { c } = useApp();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative w-full ${wide ? "sm:max-w-xl" : "sm:max-w-md"} ${c.surface} rounded-t-3xl sm:rounded-2xl border ${c.border} p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${c.text}`}>{title}</h3>
          <button onClick={onClose} className={`${c.subtext} hover:opacity-70`}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  const { c } = useApp();
  return (
    <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${c.text}`}>{title}</h1>
        {subtitle && <p className={`text-sm ${c.subtext} mt-1`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ============================================================ NAVIGATION */

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "bills", label: "Bills", icon: FileText },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "debt", label: "Debt", icon: CreditCard },
  { id: "goals", label: "Goals", icon: Target },
  { id: "subscriptions", label: "Subscriptions", icon: RefreshCw },
  { id: "networth", label: "Net Worth", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function Sidebar({ page, setPage }) {
  const { c, data, symbol } = useApp();
  return (
    <aside className={`hidden md:flex md:flex-col w-64 shrink-0 border-r ${c.border} ${c.surface} h-screen sticky top-0`}>
      <div className="px-6 py-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">L</div>
        <span className={`font-bold text-lg tracking-tight ${c.text}`}>Ledger</span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${page === item.id ? c.active : `${c.subtext} ${c.hover}`}`}>
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className={`m-3 p-3 rounded-xl ${c.surfaceAlt} text-xs ${c.subtext}`}>
        Signed in as <span className={`font-semibold ${c.text}`}>{data.profile.name || "you"}</span>
      </div>
    </aside>
  );
}

function TopBar({ page, onMenu }) {
  const { c, data, update } = useApp();
  const label = NAV_ITEMS.find(n => n.id === page)?.label || "Ledger";
  return (
    <div className={`md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 border-b ${c.border} ${c.surface}`}>
      <button onClick={onMenu} className={`p-2 -ml-2 rounded-lg ${c.hover}`}><Menu size={20} className={c.text} /></button>
      <span className={`font-bold ${c.text}`}>{label}</span>
      <button onClick={() => update({ theme: data.theme === "dark" ? "light" : "dark" })} className={`p-2 -mr-2 rounded-lg ${c.hover}`}>
        {data.theme === "dark" ? <Sun size={18} className={c.text} /> : <Moon size={18} className={c.text} />}
      </button>
    </div>
  );
}

function MobileDrawer({ open, onClose, page, setPage }) {
  const { c } = useApp();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`absolute left-0 top-0 bottom-0 w-72 ${c.surface} p-4 overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">L</div>
            <span className={`font-bold text-lg ${c.text}`}>Ledger</span>
          </div>
          <button onClick={onClose} className={c.subtext}><X size={20} /></button>
        </div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${page === item.id ? c.active : `${c.subtext} ${c.hover}`}`}>
              <item.icon size={18} />{item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ============================================================ ONBOARDING */

function Onboarding() {
  const { update, c } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", currency: "ZAR", income: "", payFrequency: "Monthly", mainGoal: "", majorExpenses: "", hasDebt: "", targetSavings: "" });

  const steps = [
    { key: "income", title: "What's your monthly income?", body: "This helps us build your starting budget. You can change it anytime.", el: <Input type="number" min="0" placeholder="e.g. 20000" value={form.income} onChange={e => setForm(f => ({ ...f, income: e.target.value }))} /> },
    { key: "currency", title: "What currency do you use?", body: "Every number in the app will use this currency.", el: (
        <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
          {Object.keys(CURRENCY_SYMBOLS).map(cur => <option key={cur} value={cur}>{cur} ({CURRENCY_SYMBOLS[cur]})</option>)}
        </Select>
      ) },
    { key: "mainGoal", title: "What's your main financial goal right now?", body: "For example: build an emergency fund, pay off debt, save for a trip.", el: <Input placeholder="e.g. Build a 3-month emergency fund" value={form.mainGoal} onChange={e => setForm(f => ({ ...f, mainGoal: e.target.value }))} /> },
    { key: "payFrequency", title: "How often do you get paid?", body: "", el: (
        <Select value={form.payFrequency} onChange={e => setForm(f => ({ ...f, payFrequency: e.target.value }))}>
          {["Monthly", "Weekly", "Bi-weekly", "Irregular"].map(x => <option key={x} value={x}>{x}</option>)}
        </Select>
      ) },
    { key: "majorExpenses", title: "What are your major monthly expenses?", body: "A rough list is fine — you'll set exact amounts in Budget.", el: <Input placeholder="e.g. Rent, transport, groceries" value={form.majorExpenses} onChange={e => setForm(f => ({ ...f, majorExpenses: e.target.value }))} /> },
    { key: "hasDebt", title: "Do you currently have any debt?", body: "", el: (
        <div className="flex gap-3">
          {["Yes", "No"].map(v => (
            <button key={v} type="button" onClick={() => setForm(f => ({ ...f, hasDebt: v }))}
              className={`flex-1 py-3 rounded-xl border font-semibold text-sm ${form.hasDebt === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}>{v}</button>
          ))}
        </div>
      ) },
    { key: "targetSavings", title: "How much would you like to save each month?", body: "This becomes your starting Emergency Fund contribution.", el: <Input type="number" min="0" placeholder="e.g. 2000" value={form.targetSavings} onChange={e => setForm(f => ({ ...f, targetSavings: e.target.value }))} /> },
  ];

  function finish() {
    const income = Number(form.income) || 0;
    const hasDebt = form.hasDebt === "Yes";
    const cats = seedBudget(income, hasDebt);
    if (form.targetSavings) {
      const efIdx = cats.findIndex(c2 => c2.name === "Emergency Fund");
      if (efIdx >= 0) cats[efIdx].planned = Number(form.targetSavings) || cats[efIdx].planned;
    }
    update({
      onboarded: true,
      profile: { name: form.name, currency: form.currency || "ZAR", monthlyIncome: income, payFrequency: form.payFrequency, mainGoal: form.mainGoal, hasDebt },
      categories: cats,
    });
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">L</div>
          <span className="font-bold text-xl text-slate-900">Ledger</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-7">
          {step === 0 && (
            <div className="mb-5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your name (optional)</span>
              <Input className="mt-1.5" placeholder="e.g. Thandi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          )}
          <h2 className="text-lg font-bold text-slate-900">{current.title}</h2>
          {current.body && <p className="text-sm text-slate-500 mt-1 mb-4">{current.body}</p>}
          {!current.body && <div className="mb-4" />}
          {current.el}

          <div className="flex items-center gap-1.5 mt-6 mb-5">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-indigo-600" : "bg-slate-200"}`} />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button onClick={() => (isLast ? finish() : setStep(s => s + 1))} className="text-sm font-medium text-slate-400 hover:text-slate-600">
              Skip
            </button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>}
              <Button onClick={() => (isLast ? finish() : setStep(s => s + 1))}>
                {isLast ? "Start budgeting" : "Next"}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">You can change any of this later in Settings.</p>
      </div>
    </div>
  );
}

/* ============================================================ DASHBOARD */

function KpiCard({ label, value, tone = "neutral", icon: Icon, sub }) {
  const { c } = useApp();
  const toneColor = { positive: "text-emerald-600", negative: "text-rose-600", neutral: c.text, brand: "text-indigo-600" }[tone];
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${c.subtext} uppercase tracking-wide`}>{label}</span>
        {Icon && <Icon size={15} className={c.faint} />}
      </div>
      <div className={`text-xl font-bold ${toneColor}`}>{value}</div>
      {sub && <div className={`text-xs ${c.faint} mt-1`}>{sub}</div>}
    </Card>
  );
}

function useComputed() {
  const { data } = useApp();
  return useMemo(() => {
    const income = Number(data.profile.monthlyIncome) || 0;
    const monthExpenses = data.transactions.filter(t => t.type === "expense" && inCurrentMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthIncomeActual = data.transactions.filter(t => t.type === "income" && inCurrentMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const balance = data.transactions.reduce((s, t) => s + (t.type === "income" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);
    const remaining = income - monthExpenses;
    const totalSaved = data.savingsGoals.reduce((s, g) => s + Number(g.current || 0), 0);
    const totalDebt = data.debts.reduce((s, d) => s + Number(d.balance || 0), 0);
    const savingsRate = income > 0 ? Math.max(0, remaining) / income : 0;
    const categorySpent = (name) => data.transactions.filter(t => t.type === "expense" && t.category === name && inCurrentMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalPlanned = data.categories.reduce((s, cat) => s + Number(cat.planned || 0), 0);
    const totalSpentAll = data.categories.reduce((s, cat) => s + categorySpent(cat.name), 0);
    const budgetProgress = totalPlanned > 0 ? totalSpentAll / totalPlanned : 0;
    const subsMonthlyTotal = data.subscriptions.filter(s => s.status !== "Cancelled").reduce((s, sub) => s + monthlyEquivalent(sub.cost, sub.frequency), 0);
    const spendingByCategory = EXPENSE_CATEGORIES.map((name, i) => ({
      name, value: data.transactions.filter(t => t.type === "expense" && t.category === name && inCurrentMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0), color: PALETTE[i % PALETTE.length]
    })).filter(x => x.value > 0);
    return { income, monthExpenses, monthIncomeActual, balance, remaining, totalSaved, totalDebt, savingsRate, categorySpent, totalPlanned, totalSpentAll, budgetProgress, subsMonthlyTotal, spendingByCategory };
  }, [data]);
}

function getInsights(data, computed) {
  const insights = [];
  const { income, monthExpenses, remaining, subsMonthlyTotal, budgetProgress } = computed;
  if (income > 0) {
    const pct = Math.round((monthExpenses / income) * 100);
    insights.push({ tone: pct > 100 ? "negative" : "brand", text: `You've used ${pct}% of your income this month.` });
  }
  insights.push({ tone: remaining >= 0 ? "positive" : "negative", text: remaining >= 0 ? `You have ${formatMoney(remaining, data.profile.currency)} remaining in your monthly budget.` : `You've gone ${formatMoney(Math.abs(remaining), data.profile.currency)} over your monthly budget.` });
  if (subsMonthlyTotal > 0) insights.push({ tone: "neutral", text: `Your subscriptions cost ${formatMoney(subsMonthlyTotal, data.profile.currency)} per month.` });
  data.savingsGoals.forEach(g => {
    const remainingGoal = Number(g.target || 0) - Number(g.current || 0);
    const contrib = Number(g.monthlyContribution || 0);
    if (remainingGoal > 0 && contrib > 0) {
      const months = Math.ceil(remainingGoal / contrib);
      insights.push({ tone: "positive", text: `You're on track to reach "${g.name}" in about ${months} month${months === 1 ? "" : "s"}.` });
    }
  });
  const overBudgetCats = data.categories.filter(cat => computed.categorySpent(cat.name) > Number(cat.planned || 0) && Number(cat.planned || 0) > 0);
  if (overBudgetCats.length > 0) insights.push({ tone: "negative", text: `You're over budget in ${overBudgetCats.map(c2 => c2.name).join(", ")}.` });
  return insights.slice(0, 4);
}

function Dashboard() {
  const { data, c } = useApp();
  const computed = useComputed();
  const insights = getInsights(data, computed);
  const upcomingBills = [...data.bills].filter(b => b.status !== "Paid").sort((a, b) => new Date(a.dueDate || "9999") - new Date(b.dueDate || "9999")).slice(0, 5);
  const recentTx = [...data.transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader title={`${greeting}${data.profile.name ? ", " + data.profile.name : ""}`} subtitle="Here's how your money looks right now." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Current Balance" value={formatMoney(computed.balance, data.profile.currency)} tone={computed.balance >= 0 ? "positive" : "negative"} icon={Wallet2} />
        <KpiCard label="Monthly Income" value={formatMoney(computed.income, data.profile.currency)} icon={ArrowUpRight} />
        <KpiCard label="Monthly Spending" value={formatMoney(computed.monthExpenses, data.profile.currency)} icon={ArrowDownRight} />
        <KpiCard label="Money Remaining" value={formatMoney(computed.remaining, data.profile.currency)} tone={computed.remaining >= 0 ? "positive" : "negative"} />
        <KpiCard label="Total Savings" value={formatMoney(computed.totalSaved, data.profile.currency)} tone="positive" icon={PiggyBank} />
        <KpiCard label="Total Debt" value={formatMoney(computed.totalDebt, data.profile.currency)} tone={computed.totalDebt > 0 ? "negative" : "neutral"} icon={CreditCard} />
        <KpiCard label="Savings Rate" value={`${Math.round(computed.savingsRate * 100)}%`} tone="brand" />
        <KpiCard label="Budget Used" value={`${Math.round(computed.budgetProgress * 100)}%`} tone={computed.budgetProgress > 1 ? "negative" : "brand"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Spending by category</h3>
          {computed.spendingByCategory.length === 0 ? (
            <p className={`text-sm ${c.subtext} py-10 text-center`}>Log a transaction to see your breakdown here.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={computed.spendingByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {computed.spendingByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v, data.profile.currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Budget vs. actual</h3>
          {data.categories.length === 0 ? (
            <p className={`text-sm ${c.subtext} py-10 text-center`}>Add categories in Budget to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.categories.map(cat => ({ name: cat.name, Planned: Number(cat.planned) || 0, Actual: computed.categorySpent(cat.name) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v, data.profile.currency)} />
                <Bar dataKey="Planned" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Upcoming bills</h3>
          {upcomingBills.length === 0 ? <p className={`text-sm ${c.subtext}`}>No unpaid bills. Nice.</p> : (
            <div className="space-y-2.5">
              {upcomingBills.map(b => (
                <div key={b.id} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${c.text}`}>{b.name}</p>
                    <p className={`text-xs ${c.faint}`}>{fmtDate(b.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${c.text}`}>{formatMoney(b.amount, data.profile.currency)}</span>
                    {isPast(b.dueDate) ? <Badge tone="negative">Overdue</Badge> : <Badge tone="warning">Due</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Recent transactions</h3>
          {recentTx.length === 0 ? <p className={`text-sm ${c.subtext}`}>Nothing logged yet.</p> : (
            <div className="space-y-2.5">
              {recentTx.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${c.text}`}>{t.description || t.category}</p>
                    <p className={`text-xs ${c.faint}`}>{fmtDate(t.date)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.type === "income" ? "+" : "-"}{formatMoney(t.amount, data.profile.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3 flex items-center gap-1.5`}><Sparkles size={16} className="text-indigo-500" /> Financial insights</h3>
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2">
                {ins.tone === "negative" ? <AlertTriangle size={15} className="text-rose-500 mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />}
                <p className={`text-sm ${c.subtext}`}>{ins.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================ BUDGET */

function BudgetPage() {
  const { data, update, c } = useApp();
  const computed = useComputed();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "variable", planned: "" });
  const [error, setError] = useState("");

  const groups = [
    { key: "fixed", label: "Fixed Expenses" },
    { key: "variable", label: "Variable Expenses" },
    { key: "savings", label: "Savings" },
    { key: "debt", label: "Debt Payments" },
  ];

  function addCategory() {
    const name = form.name.trim();
    if (!name) { setError("Please enter a category name."); return; }
    if (data.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) { setError("That category already exists."); return; }
    update({ categories: [...data.categories, { id: uid(), name, type: form.type, planned: Math.max(0, Number(form.planned) || 0) }] });
    setForm({ name: "", type: "variable", planned: "" });
    setError("");
    setModal(false);
  }
  function removeCategory(id) { update({ categories: data.categories.filter(cat => cat.id !== id) }); }
  function editPlanned(id, value) {
    update({ categories: data.categories.map(cat => cat.id === id ? { ...cat, planned: Math.max(0, Number(value) || 0) } : cat) });
  }

  return (
    <div>
      <PageHeader title="Budget" subtitle="Plan what you'll spend, and see what you actually do." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add category</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Income" value={formatMoney(computed.income, data.profile.currency)} tone="positive" />
        <KpiCard label="Planned" value={formatMoney(computed.totalPlanned, data.profile.currency)} />
        <KpiCard label="Actual Spent" value={formatMoney(computed.totalSpentAll, data.profile.currency)} tone={computed.totalSpentAll > computed.totalPlanned ? "negative" : "neutral"} />
        <KpiCard label="Remaining" value={formatMoney(computed.income - computed.totalSpentAll, data.profile.currency)} tone={computed.income - computed.totalSpentAll >= 0 ? "positive" : "negative"} />
      </div>

      {data.categories.length === 0 ? (
        <EmptyState icon={Wallet} title="No budget categories yet" body="Add your first category — like Rent or Groceries — to start tracking planned vs. actual spending." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add category</Button>} />
      ) : (
        <div className="space-y-6">
          {groups.map(g => {
            const cats = data.categories.filter(cat => cat.type === g.key);
            if (cats.length === 0) return null;
            return (
              <div key={g.key}>
                <h3 className={`text-sm font-bold uppercase tracking-wide ${c.subtext} mb-2.5`}>{g.label}</h3>
                <div className="space-y-2.5">
                  {cats.map(cat => {
                    const spent = computed.categorySpent(cat.name);
                    const planned = Number(cat.planned) || 0;
                    const pct = planned > 0 ? (spent / planned) * 100 : 0;
                    const tone = pct >= 100 ? "negative" : pct >= 80 ? "warning" : "positive";
                    return (
                      <Card key={cat.id} className="!p-4">
                        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                          <div>
                            <p className={`font-semibold ${c.text}`}>{cat.name}</p>
                            <p className={`text-xs ${c.faint}`}>
                              {formatMoney(spent, data.profile.currency)} spent of {formatMoney(planned, data.profile.currency)}
                              {planned > 0 && ` · ${formatMoney(Math.max(0, planned - spent), data.profile.currency)} left`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {pct >= 100 && <Badge tone="negative">Over budget</Badge>}
                            {pct >= 80 && pct < 100 && <Badge tone="warning">Almost there</Badge>}
                            <Input type="number" min="0" value={cat.planned} onChange={e => editPlanned(cat.id, e.target.value)} className="!w-28 !py-1.5" />
                            <IconButton icon={Trash2} tone="danger" onClick={() => removeCategory(cat.id)} title="Delete category" />
                          </div>
                        </div>
                        <ProgressBar pct={pct} tone={tone} />
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add budget category">
        <div className="space-y-4">
          <Field label="Category name" error={error}>
            <Input placeholder="e.g. Groceries" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="fixed">Fixed Expense</option>
              <option value="variable">Variable Expense</option>
              <option value="savings">Savings</option>
              <option value="debt">Debt Payment</option>
            </Select>
          </Field>
          <Field label="Planned monthly amount">
            <Input type="number" min="0" placeholder="0" value={form.planned} onChange={e => setForm(f => ({ ...f, planned: e.target.value }))} />
          </Field>
          <Button className="w-full" onClick={addCategory}>Add category</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ TRANSACTIONS */

function TransactionsPage() {
  const { data, update, c } = useApp();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ amount: "", type: "expense", category: EXPENSE_CATEGORIES[0], date: todayISO(), description: "", paymentMethod: PAYMENT_METHODS[0], needWant: "Need" });
  const [error, setError] = useState("");

  function addTx() {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setError("Enter an amount greater than zero."); return; }
    if (!form.date) { setError("Please choose a date."); return; }
    update({ transactions: [{ id: uid(), ...form, amount }, ...data.transactions] });
    setForm({ amount: "", type: "expense", category: EXPENSE_CATEGORIES[0], date: todayISO(), description: "", paymentMethod: PAYMENT_METHODS[0], needWant: "Need" });
    setError("");
    setModal(false);
  }
  function removeTx(id) { update({ transactions: data.transactions.filter(t => t.id !== id) }); }

  const filtered = data.transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCat !== "all" && t.category !== filterCat) return false;
    if (search && !(`${t.description} ${t.category}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Every rand in, every rand out." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add transaction</Button>} />

      <Card className="!p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${c.faint}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions"
              className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${c.input}`} />
          </div>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="!w-auto">
            <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option>
          </Select>
          <Select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="!w-auto">
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions found" body="Add a transaction or adjust your filters." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add transaction</Button>} />
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <Card key={t.id} className="!p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                  {t.type === "income" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div className="min-w-0">
                  <p className={`font-medium text-sm ${c.text} truncate`}>{t.description || t.category}</p>
                  <p className={`text-xs ${c.faint}`}>{t.category} · {fmtDate(t.date)}{t.needWant ? ` · ${t.needWant}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {t.type === "income" ? "+" : "-"}{formatMoney(t.amount, data.profile.currency)}
                </span>
                <IconButton icon={Trash2} tone="danger" onClick={() => removeTx(t.id)} title="Delete" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add transaction">
        <div className="space-y-4">
          <div className="flex gap-2">
            {["expense", "income"].map(ty => (
              <button key={ty} onClick={() => setForm(f => ({ ...f, type: ty }))}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm capitalize ${form.type === ty ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}>{ty}</button>
            ))}
          </div>
          <Field label="Amount" error={error}>
            <Input type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          {form.type === "expense" && (
            <Field label="Category">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Date">
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Description">
            <Input placeholder="e.g. Woolworths groceries" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Payment method">
            <Select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          {form.type === "expense" && (
            <Field label="Need or want">
              <div className="flex gap-2">
                {["Need", "Want"].map(v => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, needWant: v }))}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium ${form.needWant === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}>{v}</button>
                ))}
              </div>
            </Field>
          )}
          <Button className="w-full" onClick={addTx}>Add transaction</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ BILLS */

function BillsPage() {
  const { data, update, c } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", dueDate: "", frequency: "Monthly" });
  const [error, setError] = useState("");

  function addBill() {
    if (!form.name.trim()) { setError("Please enter a bill name."); return; }
    update({ bills: [...data.bills, { id: uid(), ...form, amount: Math.max(0, Number(form.amount) || 0), status: "Unpaid" }] });
    setForm({ name: "", amount: "", dueDate: "", frequency: "Monthly" });
    setError("");
    setModal(false);
  }
  function markPaid(id) { update({ bills: data.bills.map(b => b.id === id ? { ...b, status: "Paid" } : b) }); }
  function removeBill(id) { update({ bills: data.bills.filter(b => b.id !== id) }); }

  const overdue = data.bills.filter(b => b.status !== "Paid" && isPast(b.dueDate));
  const upcoming = data.bills.filter(b => b.status !== "Paid" && !isPast(b.dueDate)).sort((a, b) => new Date(a.dueDate || "9999") - new Date(b.dueDate || "9999"));
  const paid = data.bills.filter(b => b.status === "Paid");

  const Section = ({ title, list, tone }) => list.length > 0 && (
    <div className="mb-6">
      <h3 className={`text-sm font-bold uppercase tracking-wide ${c.subtext} mb-2.5`}>{title}</h3>
      <div className="space-y-2">
        {list.map(b => (
          <Card key={b.id} className="!p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className={`font-semibold ${c.text}`}>{b.name}</p>
              <p className={`text-xs ${c.faint}`}>{b.frequency} · Due {fmtDate(b.dueDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={tone}>{b.status === "Paid" ? "Paid" : isPast(b.dueDate) ? "Overdue" : "Upcoming"}</Badge>
              <span className={`font-semibold text-sm ${c.text}`}>{formatMoney(b.amount, data.profile.currency)}</span>
              {b.status !== "Paid" && <Button variant="secondary" onClick={() => markPaid(b.id)}>Mark paid</Button>}
              <IconButton icon={Trash2} tone="danger" onClick={() => removeBill(b.id)} title="Delete" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Bills" subtitle="Never miss a due date." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add bill</Button>} />
      {data.bills.length === 0 ? (
        <EmptyState icon={FileText} title="No bills added yet" body="Add your recurring bills so Ledger can warn you before they're due." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add bill</Button>} />
      ) : (
        <>
          <Section title="Overdue" list={overdue} tone="negative" />
          <Section title="Upcoming" list={upcoming} tone="warning" />
          <Section title="Paid" list={paid} tone="positive" />
        </>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add bill">
        <div className="space-y-4">
          <Field label="Bill name" error={error}><Input placeholder="e.g. Electricity" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Amount"><Input type="number" min="0" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Due date"><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field>
          <Field label="Frequency">
            <Select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
              {FREQUENCIES.map(fr => <option key={fr} value={fr}>{fr}</option>)}
            </Select>
          </Field>
          <Button className="w-full" onClick={addBill}>Add bill</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ GOAL CARD (shared: savings + financial goals) */

function GoalCard({ goal, onAddMoney, onDelete, currency, showDeadlineNeed }) {
  const { c } = useApp();
  const target = Number(goal.target) || 0;
  const current = Number(goal.current) || 0;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  let monthlyNeeded = null;
  if (showDeadlineNeed && goal.deadline) {
    const months = Math.max(1, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30)));
    monthlyNeeded = remaining / months;
  }
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className={`font-semibold ${c.text}`}>{goal.name}</p>
          <p className={`text-xs ${c.faint}`}>{fmtDate(goal.deadline || goal.targetDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          {pct >= 100 && <Badge tone="positive">Complete</Badge>}
          <IconButton icon={Trash2} tone="danger" onClick={onDelete} title="Delete goal" />
        </div>
      </div>
      <ProgressBar pct={pct} tone={pct >= 100 ? "positive" : "brand"} />
      <div className="flex items-center justify-between mt-2 text-sm">
        <span className={c.subtext}>{formatMoney(current, currency)} of {formatMoney(target, currency)}</span>
        <span className={`font-semibold ${c.text}`}>{Math.round(pct)}%</span>
      </div>
      {remaining > 0 && <p className={`text-xs ${c.faint} mt-1`}>{formatMoney(remaining, currency)} to go{monthlyNeeded ? ` · ~${formatMoney(monthlyNeeded, currency)}/mo needed` : ""}</p>}
      <Button variant="secondary" className="w-full mt-3" onClick={onAddMoney}>+ Add money</Button>
    </Card>
  );
}

function SavingsPage() {
  const { data, update, c } = useApp();
  const [modal, setModal] = useState(false);
  const [addMoneyId, setAddMoneyId] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [form, setForm] = useState({ name: "", target: "", current: "", targetDate: "", monthlyContribution: "" });
  const suggestions = ["Emergency Fund", "Vacation", "Car", "House", "Education", "New Laptop"];

  function addGoal(name) {
    const goalName = name || form.name.trim();
    if (!goalName) return;
    update({ savingsGoals: [...data.savingsGoals, { id: uid(), name: goalName, target: Number(form.target) || 0, current: Number(form.current) || 0, targetDate: form.targetDate, monthlyContribution: Number(form.monthlyContribution) || 0 }] });
    setForm({ name: "", target: "", current: "", targetDate: "", monthlyContribution: "" });
    setModal(false);
  }
  function removeGoal(id) { update({ savingsGoals: data.savingsGoals.filter(g => g.id !== id) }); }
  function confirmAddMoney() {
    update({ savingsGoals: data.savingsGoals.map(g => g.id === addMoneyId ? { ...g, current: Number(g.current || 0) + (Number(addAmount) || 0) } : g) });
    setAddMoneyId(null); setAddAmount("");
  }

  return (
    <div>
      <PageHeader title="Savings" subtitle="Save with a purpose." action={<Button onClick={() => setModal(true)}><Plus size={16} /> New goal</Button>} />
      {data.savingsGoals.length === 0 ? (
        <div>
          <EmptyState icon={PiggyBank} title="Start your first savings goal" body="Pick a goal below to get going quickly." />
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {suggestions.map(s => <Button key={s} variant="secondary" onClick={() => addGoal(s)}>{s}</Button>)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.savingsGoals.map(g => (
            <GoalCard key={g.id} goal={g} currency={data.profile.currency} onDelete={() => removeGoal(g.id)} onAddMoney={() => { setAddMoneyId(g.id); setAddAmount(""); }} />
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="New savings goal">
        <div className="space-y-4">
          <Field label="Goal name"><Input placeholder="e.g. Emergency Fund" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Target amount"><Input type="number" min="0" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} /></Field>
          <Field label="Current savings"><Input type="number" min="0" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} /></Field>
          <Field label="Target date"><Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} /></Field>
          <Field label="Monthly contribution (optional)"><Input type="number" min="0" value={form.monthlyContribution} onChange={e => setForm(f => ({ ...f, monthlyContribution: e.target.value }))} /></Field>
          <Button className="w-full" onClick={() => addGoal()}>Create goal</Button>
        </div>
      </Modal>
      <Modal open={!!addMoneyId} onClose={() => setAddMoneyId(null)} title="Add money to goal">
        <div className="space-y-4">
          <Field label="Amount"><Input type="number" min="0" value={addAmount} onChange={e => setAddAmount(e.target.value)} /></Field>
          <Button className="w-full" onClick={confirmAddMoney}>Add</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ DEBT */

function DebtPage() {
  const { data, update, c } = useApp();
  const [modal, setModal] = useState(false);
  const [view, setView] = useState("snowball");
  const [form, setForm] = useState({ name: "", balance: "", rate: "", minPayment: "", extraPayment: "", dueDate: "" });

  function addDebt() {
    if (!form.name.trim()) return;
    const balance = Math.max(0, Number(form.balance) || 0);
    update({ debts: [...data.debts, { id: uid(), name: form.name, balance, startingBalance: balance, rate: Number(form.rate) || 0, minPayment: Number(form.minPayment) || 0, extraPayment: Number(form.extraPayment) || 0, dueDate: form.dueDate }] });
    setForm({ name: "", balance: "", rate: "", minPayment: "", extraPayment: "", dueDate: "" });
    setModal(false);
  }
  function removeDebt(id) { update({ debts: data.debts.filter(d => d.id !== id) }); }
  function editDebt(id, patch) { update({ debts: data.debts.map(d => d.id === id ? { ...d, ...patch } : d) }); }

  const totalDebt = data.debts.reduce((s, d) => s + Number(d.balance || 0), 0);
  const totalPaidThisMonth = data.debts.reduce((s, d) => s + Number(d.minPayment || 0) + Number(d.extraPayment || 0), 0);
  const sorted = [...data.debts].sort((a, b) => view === "snowball" ? Number(a.balance) - Number(b.balance) : Number(b.rate) - Number(a.rate));

  return (
    <div>
      <PageHeader title="Debt" subtitle="Snowball the small wins, or avalanche the interest — your call." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add debt</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <KpiCard label="Total Debt" value={formatMoney(totalDebt, data.profile.currency)} tone={totalDebt > 0 ? "negative" : "positive"} />
        <KpiCard label="Paid This Month" value={formatMoney(totalPaidThisMonth, data.profile.currency)} tone="positive" />
        <KpiCard label="Remaining Debt" value={formatMoney(totalDebt, data.profile.currency)} />
      </div>

      {data.debts.length === 0 ? (
        <EmptyState icon={CreditCard} title="No debts tracked" body="Add a debt to see your payoff order and progress." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add debt</Button>} />
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setView("snowball")} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${view === "snowball" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}>Debt Snowball</button>
            <button onClick={() => setView("avalanche")} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${view === "avalanche" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}>Debt Avalanche</button>
          </div>
          <p className={`text-xs ${c.faint} mb-4`}>{view === "snowball" ? "Ordered smallest balance first, for quick wins." : "Ordered highest interest rate first, to save the most money."}</p>
          <div className="space-y-3">
            {sorted.map((d, i) => {
              const start = Number(d.startingBalance || d.balance) || 0;
              const pct = start > 0 ? Math.min(100, ((start - Number(d.balance)) / start) * 100) : 0;
              return (
                <Card key={d.id} className="!p-4">
                  <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                      <div>
                        <p className={`font-semibold ${c.text}`}>{d.name}</p>
                        <p className={`text-xs ${c.faint}`}>{d.rate}% interest · Due {fmtDate(d.dueDate)}</p>
                      </div>
                    </div>
                    <IconButton icon={Trash2} tone="danger" onClick={() => removeDebt(d.id)} title="Delete" />
                  </div>
                  <ProgressBar pct={pct} tone="positive" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <Field label="Balance"><Input type="number" min="0" value={d.balance} onChange={e => editDebt(d.id, { balance: Number(e.target.value) || 0 })} className="!py-1.5" /></Field>
                    <Field label="Min. payment"><Input type="number" min="0" value={d.minPayment} onChange={e => editDebt(d.id, { minPayment: Number(e.target.value) || 0 })} className="!py-1.5" /></Field>
                    <Field label="Extra payment"><Input type="number" min="0" value={d.extraPayment} onChange={e => editDebt(d.id, { extraPayment: Number(e.target.value) || 0 })} className="!py-1.5" /></Field>
                    <Field label="Total / month"><div className={`text-sm font-semibold ${c.text} py-2.5`}>{formatMoney(Number(d.minPayment || 0) + Number(d.extraPayment || 0), data.profile.currency)}</div></Field>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add debt">
        <div className="space-y-4">
          <Field label="Debt name"><Input placeholder="e.g. Credit Card" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Current balance"><Input type="number" min="0" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} /></Field>
          <Field label="Interest rate (%)"><Input type="number" min="0" step="0.1" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></Field>
          <Field label="Minimum payment"><Input type="number" min="0" value={form.minPayment} onChange={e => setForm(f => ({ ...f, minPayment: e.target.value }))} /></Field>
          <Field label="Extra payment"><Input type="number" min="0" value={form.extraPayment} onChange={e => setForm(f => ({ ...f, extraPayment: e.target.value }))} /></Field>
          <Field label="Due date"><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field>
          <Button className="w-full" onClick={addDebt}>Add debt</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ SUBSCRIPTIONS */

function SubscriptionsPage() {
  const { data, update, c } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", cost: "", frequency: "Monthly", renewalDate: "", category: EXPENSE_CATEGORIES[0] });

  function addSub() {
    if (!form.name.trim()) return;
    update({ subscriptions: [...data.subscriptions, { id: uid(), ...form, cost: Math.max(0, Number(form.cost) || 0), status: "Active" }] });
    setForm({ name: "", cost: "", frequency: "Monthly", renewalDate: "", category: EXPENSE_CATEGORIES[0] });
    setModal(false);
  }
  function toggleStatus(id) { update({ subscriptions: data.subscriptions.map(s => s.id === id ? { ...s, status: s.status === "Active" ? "Cancelled" : "Active" } : s) }); }
  function removeSub(id) { update({ subscriptions: data.subscriptions.filter(s => s.id !== id) }); }

  const monthlyTotal = data.subscriptions.filter(s => s.status !== "Cancelled").reduce((sum, s) => sum + monthlyEquivalent(s.cost, s.frequency), 0);
  const annualTotal = monthlyTotal * 12;
  const heavy = data.profile.monthlyIncome > 0 && monthlyTotal / data.profile.monthlyIncome > 0.1;

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Everything quietly leaving your account, in one place." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add subscription</Button>} />

      <Card className={`mb-5 !p-4 ${heavy ? "border-amber-300" : ""}`}>
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            {heavy ? <AlertTriangle size={18} className="text-amber-500" /> : <Info size={18} className="text-indigo-500" />}
            <p className={`text-sm ${c.text}`}>You spend <span className="font-bold">{formatMoney(monthlyTotal, data.profile.currency)}</span> per month (~{formatMoney(annualTotal, data.profile.currency)}/year) on subscriptions.</p>
          </div>
        </div>
      </Card>

      {data.subscriptions.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No subscriptions tracked" body="Add streaming services, memberships, or software you're paying for regularly." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Add subscription</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.subscriptions.map(s => (
            <Card key={s.id}>
              <div className="flex items-start justify-between mb-1">
                <p className={`font-semibold ${c.text}`}>{s.name}</p>
                <IconButton icon={Trash2} tone="danger" onClick={() => removeSub(s.id)} title="Delete" />
              </div>
              <p className={`text-xs ${c.faint} mb-3`}>{s.category} · {s.frequency} · Renews {fmtDate(s.renewalDate)}</p>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${c.text}`}>{formatMoney(s.cost, data.profile.currency)}</span>
                <span className={`text-xs ${c.faint}`}>{formatMoney(monthlyEquivalent(s.cost, s.frequency), data.profile.currency)}/mo</span>
              </div>
              <Button variant="secondary" className="w-full mt-3" onClick={() => toggleStatus(s.id)}>{s.status === "Active" ? "Mark cancelled" : "Reactivate"}</Button>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add subscription">
        <div className="space-y-4">
          <Field label="Subscription name"><Input placeholder="e.g. Netflix" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Cost"><Input type="number" min="0" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></Field>
          <Field label="Billing frequency">
            <Select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>{FREQUENCIES.map(fr => <option key={fr} value={fr}>{fr}</option>)}</Select>
          </Field>
          <Field label="Renewal date"><Input type="date" value={form.renewalDate} onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</Select>
          </Field>
          <Button className="w-full" onClick={addSub}>Add subscription</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ GOALS (financial goals) */

function GoalsPage() {
  const { data, update, c } = useApp();
  const [modal, setModal] = useState(false);
  const [addMoneyId, setAddMoneyId] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [form, setForm] = useState({ name: "", target: "", current: "", deadline: "" });

  function addGoal() {
    if (!form.name.trim()) return;
    update({ goals: [...data.goals, { id: uid(), name: form.name, target: Number(form.target) || 0, current: Number(form.current) || 0, deadline: form.deadline }] });
    setForm({ name: "", target: "", current: "", deadline: "" });
    setModal(false);
  }
  function removeGoal(id) { update({ goals: data.goals.filter(g => g.id !== id) }); }
  function confirmAddMoney() {
    update({ goals: data.goals.map(g => g.id === addMoneyId ? { ...g, current: Number(g.current || 0) + (Number(addAmount) || 0) } : g) });
    setAddMoneyId(null); setAddAmount("");
  }

  return (
    <div>
      <PageHeader title="Financial Goals" subtitle="The bigger-picture milestones you're working toward." action={<Button onClick={() => setModal(true)}><Plus size={16} /> New goal</Button>} />
      {data.goals.length === 0 ? (
        <EmptyState icon={Target} title="No financial goals yet" body="A house deposit, a wedding, paying off a loan in full — set the milestone here." action={<Button onClick={() => setModal(true)}><Plus size={16} /> New goal</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.goals.map(g => (
            <GoalCard key={g.id} goal={g} currency={data.profile.currency} showDeadlineNeed onDelete={() => removeGoal(g.id)} onAddMoney={() => { setAddMoneyId(g.id); setAddAmount(""); }} />
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="New financial goal">
        <div className="space-y-4">
          <Field label="Goal"><Input placeholder="e.g. House deposit" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Target amount"><Input type="number" min="0" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} /></Field>
          <Field label="Current amount"><Input type="number" min="0" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} /></Field>
          <Field label="Deadline"><Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></Field>
          <Button className="w-full" onClick={addGoal}>Create goal</Button>
        </div>
      </Modal>
      <Modal open={!!addMoneyId} onClose={() => setAddMoneyId(null)} title="Add money to goal">
        <div className="space-y-4">
          <Field label="Amount"><Input type="number" min="0" value={addAmount} onChange={e => setAddAmount(e.target.value)} /></Field>
          <Button className="w-full" onClick={confirmAddMoney}>Add</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ NET WORTH */

function NetWorthPage() {
  const { data, update, c } = useApp();
  const nw = data.netWorth;
  const totalAssets = nw.cash + nw.savings + nw.investments + nw.property + nw.vehicles + nw.other;
  const totalLiabilities = nw.creditCards + nw.loans + nw.otherLiabilities;
  const netWorth = totalAssets - totalLiabilities;

  function set(key, value) { update({ netWorth: { ...nw, [key]: Math.max(0, Number(value) || 0) } }); }
  function saveSnapshot() {
    const entry = { date: todayISO(), value: netWorth };
    const history = [...data.netWorthHistory.filter(h => h.date !== entry.date), entry].sort((a, b) => new Date(a.date) - new Date(b.date));
    update({ netWorthHistory: history });
  }

  const assetFields = [["cash", "Cash"], ["savings", "Savings"], ["investments", "Investments"], ["property", "Property"], ["vehicles", "Vehicles"], ["other", "Other assets"]];
  const liabFields = [["creditCards", "Credit cards"], ["loans", "Loans"], ["otherLiabilities", "Other liabilities"]];

  return (
    <div>
      <PageHeader title="Net Worth" subtitle="What you own, minus what you owe." action={<Button onClick={saveSnapshot}>Save snapshot</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Assets</h3>
          <div className="space-y-3">{assetFields.map(([key, label]) => (
            <Field label={label} key={key}><Input type="number" min="0" value={nw[key]} onChange={e => set(key, e.target.value)} /></Field>
          ))}</div>
          <div className="flex justify-between mt-4 pt-3 border-t border-slate-500/10">
            <span className={`text-sm font-semibold ${c.subtext}`}>Total Assets</span>
            <span className="text-sm font-bold text-emerald-600">{formatMoney(totalAssets, data.profile.currency)}</span>
          </div>
        </Card>
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Liabilities</h3>
          <div className="space-y-3">{liabFields.map(([key, label]) => (
            <Field label={label} key={key}><Input type="number" min="0" value={nw[key]} onChange={e => set(key, e.target.value)} /></Field>
          ))}</div>
          <div className="flex justify-between mt-4 pt-3 border-t border-slate-500/10">
            <span className={`text-sm font-semibold ${c.subtext}`}>Total Liabilities</span>
            <span className="text-sm font-bold text-rose-600">{formatMoney(totalLiabilities, data.profile.currency)}</span>
          </div>
        </Card>
        <Card className="flex flex-col justify-center items-center text-center">
          <p className={`text-xs font-semibold uppercase tracking-wide ${c.subtext} mb-2`}>Net Worth</p>
          <p className={`text-3xl font-bold ${netWorth >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatMoney(netWorth, data.profile.currency)}</p>
          <p className={`text-xs ${c.faint} mt-2`}>Save a snapshot regularly to build your trend line.</p>
        </Card>
      </div>

      <Card>
        <h3 className={`font-semibold ${c.text} mb-3`}>Net worth over time</h3>
        {data.netWorthHistory.length < 2 ? (
          <p className={`text-sm ${c.subtext} py-10 text-center`}>Save at least two snapshots to see your trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.netWorthHistory.map(h => ({ date: fmtDate(h.date), value: h.value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v, data.profile.currency)} />
              <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

/* ============================================================ REPORTS */

function ReportsPage() {
  const { data, c } = useApp();
  const [period, setPeriod] = useState("month");
  const computed = useComputed();

  const now = new Date();
  const rangeStart = period === "week" ? new Date(now - 6 * 86400000) : period === "month" ? startOfMonth(now) : new Date(now.getFullYear(), 0, 1);
  const inRange = (d) => { const dt = new Date(d); return !isNaN(dt) && dt >= rangeStart && dt <= now; };
  const txInRange = data.transactions.filter(t => inRange(t.date));
  const totalIncome = txInRange.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = txInRange.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, net) / totalIncome : 0;

  const byCategory = EXPENSE_CATEGORIES.map((name, i) => ({
    name, value: txInRange.filter(t => t.type === "expense" && t.category === name).reduce((s, t) => s + Number(t.amount || 0), 0), color: PALETTE[i % PALETTE.length]
  })).filter(x => x.value > 0);

  function bucketLabel(d) {
    if (period === "week") return d.toLocaleDateString(undefined, { weekday: "short" });
    if (period === "month") return `Wk ${Math.ceil(d.getDate() / 7)}`;
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  const buckets = {};
  txInRange.forEach(t => {
    const dt = new Date(t.date);
    if (isNaN(dt)) return;
    const key = bucketLabel(dt);
    buckets[key] = buckets[key] || { name: key, Income: 0, Expenses: 0 };
    buckets[key][t.type === "income" ? "Income" : "Expenses"] += Number(t.amount || 0);
  });
  const trend = Object.values(buckets);

  const budgetVsActual = data.categories.map(cat => ({ name: cat.name, Planned: Number(cat.planned) || 0, Actual: computed.categorySpent(cat.name) }));

  return (
    <div>
      <PageHeader title="Reports" subtitle="See the patterns in your money." action={
        <div className="flex gap-2">
          {[["week", "Week"], ["month", "Month"], ["year", "Year"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={`px-3.5 py-2 rounded-xl text-sm font-semibold border ${period === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}>{l}</button>
          ))}
        </div>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Income" value={formatMoney(totalIncome, data.profile.currency)} tone="positive" />
        <KpiCard label="Expenses" value={formatMoney(totalExpense, data.profile.currency)} />
        <KpiCard label="Net" value={formatMoney(net, data.profile.currency)} tone={net >= 0 ? "positive" : "negative"} />
        <KpiCard label="Savings Rate" value={`${Math.round(savingsRate * 100)}%`} tone="brand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Income vs. expenses</h3>
          {trend.length === 0 ? <p className={`text-sm ${c.subtext} py-10 text-center`}>No transactions in this period yet.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v, data.profile.currency)} />
                <Bar dataKey="Income" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 className={`font-semibold ${c.text} mb-3`}>Spending by category</h3>
          {byCategory.length === 0 ? <p className={`text-sm ${c.subtext} py-10 text-center`}>No expenses in this period yet.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v, data.profile.currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card>
        <h3 className={`font-semibold ${c.text} mb-3`}>Budget vs. actual (all time categories)</h3>
        {budgetVsActual.length === 0 ? <p className={`text-sm ${c.subtext} py-10 text-center`}>Add budget categories to compare.</p> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={budgetVsActual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v, data.profile.currency)} />
              <Bar dataKey="Planned" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

/* ============================================================ SETTINGS */

function SettingsPage() {
  const { data, update, c } = useApp();
  const [catForm, setCatForm] = useState({ name: "", type: "variable" });
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function setProfile(patch) { update({ profile: { ...data.profile, ...patch } }); }
  function addCategory() {
    if (!catForm.name.trim()) return;
    update({ categories: [...data.categories, { id: uid(), name: catForm.name, type: catForm.type, planned: 0 }] });
    setCatForm({ name: "", type: "variable" });
  }
  function removeCategory(id) { update({ categories: data.categories.filter(cat => cat.id !== id) }); }
  function toggleNotify(key) { update({ settings: { ...data.settings, [key]: !data.settings[key] } }); }
  function resetAll() { update(defaultData()); setConfirmReset(false); }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your profile, preferences, and data." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className={`font-semibold ${c.text} mb-4`}>Profile</h3>
          <div className="space-y-4">
            <Field label="Name"><Input value={data.profile.name} onChange={e => setProfile({ name: e.target.value })} /></Field>
            <Field label="Currency">
              <Select value={data.profile.currency} onChange={e => setProfile({ currency: e.target.value })}>
                {Object.keys(CURRENCY_SYMBOLS).map(cur => <option key={cur} value={cur}>{cur} ({CURRENCY_SYMBOLS[cur]})</option>)}
              </Select>
            </Field>
            <Field label="Monthly income"><Input type="number" min="0" value={data.profile.monthlyIncome} onChange={e => setProfile({ monthlyIncome: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            <Field label="Pay frequency">
              <Select value={data.profile.payFrequency} onChange={e => setProfile({ payFrequency: e.target.value })}>
                {["Monthly", "Weekly", "Bi-weekly", "Irregular"].map(x => <option key={x} value={x}>{x}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className={`font-semibold ${c.text} mb-4`}>Appearance</h3>
          <Field label="Theme">
            <div className="flex gap-2">
              <button onClick={() => update({ theme: "light" })} className={`flex-1 py-2.5 rounded-xl border font-medium text-sm flex items-center justify-center gap-2 ${data.theme === "light" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}><Sun size={15} /> Light</button>
              <button onClick={() => update({ theme: "dark" })} className={`flex-1 py-2.5 rounded-xl border font-medium text-sm flex items-center justify-center gap-2 ${data.theme === "dark" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : `${c.border} ${c.subtext}`}`}><Moon size={15} /> Dark</button>
            </div>
          </Field>

          <h3 className={`font-semibold ${c.text} mt-6 mb-3`}>Notifications</h3>
          <div className="space-y-3">
            {[["notifyBills", "Bill due reminders"], ["notifyBudget", "Budget limit warnings"]].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className={`text-sm ${c.text}`}>{label}</span>
                <button onClick={() => toggleNotify(key)} className={`w-11 h-6 rounded-full transition relative ${data.settings[key] ? "bg-indigo-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${data.settings[key] ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className={`font-semibold ${c.text} mb-4`}>Categories</h3>
          <div className="flex gap-2 mb-4">
            <Input placeholder="New category" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
            <Select value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))} className="!w-auto">
              <option value="fixed">Fixed</option><option value="variable">Variable</option><option value="savings">Savings</option><option value="debt">Debt</option>
            </Select>
            <Button onClick={addCategory}><Plus size={16} /></Button>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {data.categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between py-1.5">
                <span className={`text-sm ${c.text}`}>{cat.name} <span className={c.faint}>· {cat.type}</span></span>
                <IconButton icon={Trash2} tone="danger" onClick={() => removeCategory(cat.id)} title="Delete" />
              </div>
            ))}
            {data.categories.length === 0 && <p className={`text-sm ${c.faint}`}>No categories yet.</p>}
          </div>
        </Card>

        <Card>
          <h3 className={`font-semibold ${c.text} mb-4`}>Data</h3>
          <div className="flex flex-col gap-2.5">
            <Button variant="secondary" onClick={() => setExportOpen(true)}>Export data</Button>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset all data</Button>
          </div>
        </Card>
      </div>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export data" wide>
        <p className={`text-sm ${c.subtext} mb-3`}>Copy this JSON to back up or move your data.</p>
        <textarea readOnly value={JSON.stringify(data, null, 2)} className={`w-full h-64 rounded-xl border p-3 text-xs font-mono outline-none ${c.input}`} onFocus={e => e.target.select()} />
      </Modal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className={`text-sm ${c.subtext} mb-4`}>This permanently clears every transaction, budget, goal, and setting. This can't be undone.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={resetAll}>Yes, reset</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================ APP ROOT */

export default function App() {
  const [data, setData] = useState(defaultData());
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ledger-data");
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...defaultData(), ...parsed, profile: { ...defaultData().profile, ...(parsed.profile || {}) }, settings: { ...defaultData().settings, ...(parsed.settings || {}) } });
      }
    } catch (e) { /* no saved data yet */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem("ledger-data", JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }, [data, loaded]);

  function update(patch) { setData(prev => ({ ...prev, ...patch })); }

  const c = THEMES[data.theme === "dark" ? "dark" : "light"];
  const ctx = { data, update, c, currency: data.profile.currency, symbol: CURRENCY_SYMBOLS[data.profile.currency] || "" };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data.onboarded) {
    return (
      <AppCtx.Provider value={ctx}>
        <Onboarding />
      </AppCtx.Provider>
    );
  }

  const pages = {
    home: Dashboard, budget: BudgetPage, transactions: TransactionsPage, bills: BillsPage,
    savings: SavingsPage, debt: DebtPage, goals: GoalsPage, subscriptions: SubscriptionsPage,
    networth: NetWorthPage, reports: ReportsPage, settings: SettingsPage,
  };
  const Page = pages[page] || Dashboard;

  return (
    <AppCtx.Provider value={ctx}>
      <div className={`min-h-screen ${c.bg}`}>
        <div className="flex">
          <Sidebar page={page} setPage={setPage} />
          <div className="flex-1 min-w-0">
            <TopBar page={page} onMenu={() => setDrawerOpen(true)} />
            <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} page={page} setPage={setPage} />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-10">
              <Page />
            </main>
          </div>
        </div>
      </div>
    </AppCtx.Provider>
  );
}
