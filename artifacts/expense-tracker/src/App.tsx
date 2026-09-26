import { type ElementType, type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type User = { id: string; name: string; email: string };
type Expense = { id: string; amount: number; description: string; category: string; date: string; payment_method: string; note: string; created_at: string };
type Income = { id: string; amount: number; source: string; category: string; date: string; note: string; created_at: string };
type Budget = { id: string; category: string; month: string; limit_amount: number; spent: number; created_at: string };
type Subscription = { id: string; name: string; amount: number; billing_cycle: "monthly" | "yearly"; next_payment: string; category: string; created_at: string };
type SplitBill = { id: string; title: string; total_amount: number; people_count: number; your_share: number; status: "open" | "settled"; created_at: string };
type Dashboard = {
  month: string; total: number; previous_total: number; change_percent: number | null; transaction_count: number;
  daily_spend: { date: string; total: number }[]; category_spend: { category: string; total: number }[];
  income_total: number; net_savings: number; daily_average: number; top_category: string | null; budgets: Budget[];
};

const EXPENSE_CATEGORIES = ["Food & dining", "Housing", "Transport", "Shopping", "Health", "Entertainment", "Bills", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Gift", "Other"];
const PAYMENT_OPTIONS = ["UPI", "Debit card", "Credit card", "Bank transfer", "Cash"];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/_api${path}`, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? "Something went wrong. Try again.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${month}-02T12:00:00`));
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-02T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function greeting(name: string) {
  const hour = new Date().getHours();
  return `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, ${name.split(" ")[0]}.`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await api<{ user: User }>(`/auth/${mode}`, { method: "POST", body: JSON.stringify({ name: mode === "signup" ? name : undefined, email, password }) });
      onAuth(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="fintrack-brand large"><span className="brand-symbol"><IndianRupee size={20} /></span><span>FinTrack</span></div>
        <div className="auth-copy">
          <span className="overline">Your money, made clear</span>
          <h1>Build a better<br /><em>financial rhythm.</em></h1>
          <p>Track every rupee, understand your patterns, and make decisions with confidence.</p>
        </div>
        <div className="auth-proof"><span><Check size={14} /> Private by default</span><span><Check size={14} /> INR-native</span><span><Check size={14} /> Zero dummy data</span></div>
      </section>
      <section className="auth-card">
        <div className="auth-card-heading"><span className="overline">{mode === "signup" ? "Start fresh" : "Welcome back"}</span><h2>{mode === "signup" ? "Create your free account" : "Sign in to FinTrack"}</h2><p>{mode === "signup" ? "Your new ledger starts at zero. Add only what is yours." : "Your saved ledger is waiting for you."}</p></div>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Aarav Mehta" autoComplete="name" required /></label>}
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters minimum" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" disabled={busy}>{busy ? "Opening your ledger…" : mode === "signup" ? "Create account" : "Sign in"} <ArrowUpRight size={16} /></button>
        </form>
        <button className="switch-auth" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "New to FinTrack? Create an account"}</button>
      </section>
    </main>
  );
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card"><div className="modal-title"><div><span className="overline">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</section></div>;
}

function TransactionModal({ expense, income, onClose, onSaved }: { expense?: Expense; income?: Income; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<"expense" | "income">(income ? "income" : "expense");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (expense) await api(`/expenses/${expense.id}`, { method: "PATCH", body: JSON.stringify({ amount: Number(data.amount), description: data.description, category: data.category, date: data.date, payment_method: data.payment_method, note: data.note }) });
      else if (income) await api(`/income/${income.id}`, { method: "PATCH", body: JSON.stringify({ amount: Number(data.amount), source: data.description, category: data.category, date: data.date, note: data.note }) });
      else if (kind === "income") await api("/income", { method: "POST", body: JSON.stringify({ amount: Number(data.amount), source: data.description, category: data.category, date: data.date, note: data.note }) });
      else await api("/expenses", { method: "POST", body: JSON.stringify({ amount: Number(data.amount), description: data.description, category: data.category, date: data.date, payment_method: data.payment_method, note: data.note }) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this record."); } finally { setBusy(false); }
  }
  const defaultCategory = expense?.category ?? income?.category ?? (kind === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  const editing = Boolean(expense || income);
  return <Modal title={editing ? "Edit transaction" : "Add transaction"} eyebrow={editing ? "Update your ledger" : "New record"} onClose={onClose}>
    {!editing && <div className="segmented"><button className={kind === "expense" ? "active" : ""} onClick={() => setKind("expense")} type="button">Expense</button><button className={kind === "income" ? "active income" : ""} onClick={() => setKind("income")} type="button">Income</button></div>}
    <form onSubmit={submit} className="form-stack modal-form">
      <label>Amount<input name="amount" type="number" min="0.01" step="0.01" defaultValue={expense?.amount ?? ""} placeholder="0.00" autoFocus required /></label>
      <label>{kind === "income" ? "Source" : "Description"}<input name="description" defaultValue={expense?.description ?? income?.source ?? ""} placeholder={kind === "income" ? "Monthly salary" : "Dinner with friends"} required /></label>
      <div className="two-col"><label>Date<input name="date" type="date" defaultValue={expense?.date ?? income?.date ?? currentDate()} required /></label><label>Payment<select name="payment_method" defaultValue={expense?.payment_method ?? PAYMENT_OPTIONS[0]} disabled={kind === "income"}>{PAYMENT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label></div>
      <label>Category<select name="category" defaultValue={defaultCategory}>{(kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Note <span className="optional">optional</span><textarea name="note" defaultValue={expense?.note ?? income?.note ?? ""} placeholder="A little context for future you" rows={2} /></label>
      {error && <p className="form-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save transaction"}</button>
    </form>
  </Modal>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState("overview");
  const [month, setMonth] = useState(currentMonth());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [splitBills, setSplitBills] = useState<SplitBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"transaction" | "budget" | "subscription" | "split" | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense>();
  const [editingIncome, setEditingIncome] = useState<Income>();
  const [search, setSearch] = useState("");
  const [advisorQuestion, setAdvisorQuestion] = useState("");
  const [advisorAnswer, setAdvisorAnswer] = useState("");
  const [advisorBusy, setAdvisorBusy] = useState(false);

  useEffect(() => { api<{ user: User }>("/auth/me").then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setCheckingSession(false)); }, []);
  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const [summary, expenseRows, incomeRows, budgetRows, subscriptionRows, billRows] = await Promise.all([
        api<Dashboard>(`/dashboard?month=${month}`), api<Expense[]>(`/expenses?month=${month}`), api<Income[]>(`/income?month=${month}`),
        api<Budget[]>(`/budgets?month=${month}`), api<Subscription[]>("/subscriptions"), api<SplitBill[]>("/split-bills"),
      ]);
      setDashboard(summary); setExpenses(expenseRows); setIncome(incomeRows); setBudgets(budgetRows); setSubscriptions(subscriptionRows); setSplitBills(billRows);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Could not load your ledger."); } finally { setLoading(false); }
  }
  useEffect(() => { loadData(); }, [user, month]);
  async function logout() { await api("/auth/logout", { method: "POST" }); setUser(null); }
  async function remove(path: string, message: string) { try { await api(path, { method: "DELETE" }); setNotice(message); loadData(); } catch (err) { setNotice(err instanceof Error ? err.message : "Could not remove this item."); } }
  function saved(message = "Ledger updated") { setModal(null); setEditingExpense(undefined); setEditingIncome(undefined); setNotice(message); loadData(); }

  if (checkingSession) return <div className="app-loading"><div className="loading-mark"><IndianRupee size={22} /></div><span>Opening FinTrack…</span></div>;
  if (!user) return <AuthScreen onAuth={(nextUser) => setUser(nextUser)} />;
  const currentView = view;
  return <div className="fintrack-app">
    <aside className="sidebar">
      <div className="fintrack-brand"><span className="brand-symbol"><IndianRupee size={17} /></span><span>FinTrack</span></div>
      <nav className="side-nav">{[
        ["overview", LayoutDashboard, "Overview"], ["transactions", ReceiptText, "Transactions"], ["budgets", Target, "Budgets"], ["subscriptions", BellRing, "Subscriptions"], ["split", Users, "Split bills"], ["advisor", Bot, "AI advisor"],
      ].map(([id, Icon, label]) => <button key={id as string} className={currentView === id ? "active" : ""} onClick={() => setView(id as string)}><Icon size={17} />{label as string}{id === "advisor" && <span className="new-badge">NEW</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button onClick={() => { setView("settings"); }}><Settings2 size={17} />Settings</button><button className="user-mini" onClick={logout}><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>Sign out</small></span><LogOut size={15} /></button></div>
    </aside>
    <main className="main-content">
      <header className="mobile-header"><button className="icon-button"><Menu size={20} /></button><div className="fintrack-brand"><span className="brand-symbol"><IndianRupee size={15} /></span><span>FinTrack</span></div><button className="avatar">{initials(user.name)}</button></header>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
      {loading && <div className="sync-status"><RefreshCw size={13} className="spin" /> Syncing your ledger</div>}
      {currentView === "overview" && dashboard && <Overview user={user} dashboard={dashboard} month={month} setMonth={setMonth} onAdd={() => { setEditingExpense(undefined); setModal("transaction"); }} onViewTransactions={() => setView("transactions")} />}
      {currentView === "transactions" && <Transactions expenses={expenses} income={income} search={search} setSearch={setSearch} onAdd={() => { setEditingExpense(undefined); setEditingIncome(undefined); setModal("transaction"); }} onEditExpense={(expense) => { setEditingExpense(expense); setEditingIncome(undefined); setModal("transaction"); }} onEditIncome={(item) => { setEditingIncome(item); setEditingExpense(undefined); setModal("transaction"); }} onDeleteExpense={(id) => remove(`/expenses/${id}`, "Expense removed")} onDeleteIncome={(id) => remove(`/income/${id}`, "Income removed")} />}
      {currentView === "budgets" && <Budgets budgets={budgets} month={month} setMonth={setMonth} onAdd={() => setModal("budget")} onDelete={(id) => remove(`/budgets/${id}`, "Budget removed")} />}
      {currentView === "subscriptions" && <Subscriptions items={subscriptions} onAdd={() => setModal("subscription")} onDelete={(id) => remove(`/subscriptions/${id}`, "Subscription removed")} />}
      {currentView === "split" && <SplitBills bills={splitBills} onAdd={() => setModal("split")} onSettle={async (id) => { await api(`/split-bills/${id}/settle`, { method: "PATCH" }); saved("Split bill marked settled"); }} onDelete={(id) => remove(`/split-bills/${id}`, "Split bill removed")} />}
      {currentView === "advisor" && <Advisor question={advisorQuestion} setQuestion={setAdvisorQuestion} answer={advisorAnswer} busy={advisorBusy} onAsk={async () => { if (!advisorQuestion.trim()) return; setAdvisorBusy(true); try { const result = await api<{ answer: string }>("/advisor", { method: "POST", body: JSON.stringify({ question: advisorQuestion }) }); setAdvisorAnswer(result.answer); } catch (err) { setAdvisorAnswer(err instanceof Error ? err.message : "Advisor unavailable."); } finally { setAdvisorBusy(false); } }} />}
      {currentView === "settings" && <Settings user={user} onExport={(format) => { window.location.href = `/_api/export.${format}`; }} />}
      {modal === "transaction" && <TransactionModal expense={editingExpense} income={editingIncome} onClose={() => { setModal(null); setEditingExpense(undefined); setEditingIncome(undefined); }} onSaved={() => saved(editingExpense || editingIncome ? "Transaction updated" : "Transaction added")} />}
      {modal === "budget" && <BudgetModal month={month} onClose={() => setModal(null)} onSaved={() => saved("Budget added")} />}
      {modal === "subscription" && <SubscriptionModal onClose={() => setModal(null)} onSaved={() => saved("Subscription added")} />}
      {modal === "split" && <SplitModal onClose={() => setModal(null)} onSaved={() => saved("Split bill added")} />}
    </main>
  </div>;
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><span className="overline">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function Overview({ user, dashboard, month, setMonth, onAdd, onViewTransactions }: { user: User; dashboard: Dashboard; month: string; setMonth: (month: string) => void; onAdd: () => void; onViewTransactions: () => void }) {
  const maxDaily = Math.max(...dashboard.daily_spend.map((item) => item.total), 1);
  const bars = dashboard.daily_spend.slice(-14);
  const categoryTotal = Math.max(dashboard.category_spend.reduce((sum, item) => sum + item.total, 0), 1);
  const angle = dashboard.category_spend.reduce<{ value: number; pieces: string[] }>((acc, item, index) => { const start = acc.value; const end = start + (item.total / categoryTotal) * 360; const color = ["#0f766e", "#14b8a6", "#f59e0b", "#38bdf8", "#8b5cf6"][index % 5]; acc.pieces.push(`${color} ${start}deg ${end}deg`); acc.value = end; return acc; }, { value: 0, pieces: [] });
  return <div className="content-wrap"><PageHeader eyebrow="Overview" title={greeting(user.name)} copy="Here’s the clear picture of your money this month." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Add transaction</button>} />
    <div className="month-toolbar"><button className="icon-button" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button><strong>{monthLabel(month)}</strong><button className="icon-button" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button><button className="today-button" onClick={() => setMonth(currentMonth())}>Today</button></div>
    <section className="metrics-grid"><Metric label="Net savings" value={money(dashboard.net_savings)} icon={WalletCards} tone="green" detail={dashboard.net_savings >= 0 ? "You’re in the green" : "A little attention needed"} /><Metric label="Total spent" value={money(dashboard.total)} icon={ArrowDownLeft} tone="orange" detail={dashboard.change_percent === null ? "No comparison yet" : `${Math.abs(dashboard.change_percent).toFixed(0)}% vs last month`} /><Metric label="Income" value={money(dashboard.income_total)} icon={ArrowUpRight} tone="blue" detail="Money in this month" /><Metric label="Daily average" value={money(dashboard.daily_average)} icon={BarChart3} tone="purple" detail={`${dashboard.transaction_count} records logged`} /></section>
    <div className="dashboard-columns"><section className="surface chart-surface"><div className="surface-heading"><div><span className="overline">Spending rhythm</span><h2>Daily spending</h2></div><span className="chart-caption">Last 14 days</span></div><div className="bar-chart">{bars.map((item) => <div className="chart-bar" key={item.date}><span>{item.total ? money(item.total).replace("₹", "₹") : "—"}</span><div className="bar-rail"><i style={{ height: `${Math.max(item.total ? 8 : 3, (item.total / maxDaily) * 100)}%` }} /></div><small>{new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(`${item.date}T12:00:00`))}</small></div>)}</div></section><section className="surface category-surface"><div className="surface-heading"><div><span className="overline">Where it goes</span><h2>Category breakdown</h2></div><CircleDollarSign size={19} /></div>{dashboard.category_spend.length ? <div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(${angle.pieces.join(", ")})` }}><div><strong>{money(dashboard.total)}</strong><small>spent</small></div></div><div className="legend">{dashboard.category_spend.slice(0, 5).map((item, index) => <div key={item.category}><span className={`legend-dot dot-${index}`} /><span>{item.category}</span><strong>{money(item.total)}</strong></div>)}</div></div> : <EmptyState icon={WalletCards} title="Your picture starts here" copy="Add a transaction to see where your money goes." />}</section></div>
    <section className="surface budget-strip"><div><span className="overline">Stay on track</span><h2>Budget progress</h2></div>{dashboard.budgets.length ? <div className="budget-inline-list">{dashboard.budgets.slice(0, 3).map((budget) => <div className="budget-inline" key={budget.id}><div><span>{budget.category}</span><strong>{money(budget.spent)} / {money(budget.limit_amount)}</strong></div><div className="progress-track"><i style={{ width: `${Math.min(100, (budget.spent / budget.limit_amount) * 100)}%` }} /></div></div>)}</div> : <button className="text-button" onClick={onViewTransactions}>Create a budget in the Budgets tab <ArrowUpRight size={14} /></button>}</section>
    <div className="section-heading"><div><span className="overline">Recent activity</span><h2>Latest transactions</h2></div><button className="text-button" onClick={onViewTransactions}>View all <ArrowUpRight size={14} /></button></div><RecentRows dashboard={dashboard} onViewTransactions={onViewTransactions} />
  </div>;
}

function Metric({ label, value, icon: Icon, tone, detail }: { label: string; value: string; icon: React.ElementType; tone: string; detail: string }) {
  return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><strong>{value}</strong><small>{detail}</small></article>;
}

function RecentRows({ dashboard, onViewTransactions }: { dashboard: Dashboard; onViewTransactions: () => void }) {
  return <div className="recent-empty"><div className="empty-mini"><Sparkles size={18} /></div><div><strong>{dashboard.transaction_count ? `${dashboard.transaction_count} records this month` : "Your ledger is ready"}</strong><p>{dashboard.transaction_count ? `Your biggest category is ${dashboard.top_category ?? "still taking shape"}.` : "Add income or an expense and your dashboard will update instantly."}</p></div><button className="icon-button" onClick={onViewTransactions}><ArrowUpRight size={17} /></button></div>;
}

function Transactions({ expenses, income, search, setSearch, onAdd, onEditExpense, onEditIncome, onDeleteExpense, onDeleteIncome }: { expenses: Expense[]; income: Income[]; search: string; setSearch: (value: string) => void; onAdd: () => void; onEditExpense: (expense: Expense) => void; onEditIncome: (income: Income) => void; onDeleteExpense: (id: string) => void; onDeleteIncome: (id: string) => void }) {
  const query = search.toLowerCase();
  const rows = [...expenses.map((item) => ({ ...item, kind: "Expense" as const, label: item.description })), ...income.map((item) => ({ ...item, kind: "Income" as const, label: item.source }))].filter((item) => `${item.label} ${item.category}`.toLowerCase().includes(query)).sort((a, b) => b.date.localeCompare(a.date));
  return <div className="content-wrap"><PageHeader eyebrow="Ledger" title="Transactions" copy="Every rupee in one calm, searchable place." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Add transaction</button>} /><div className="toolbar-row"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your ledger" /></label><button className="quiet-button" onClick={onAdd}><Plus size={16} /> Add record</button></div><section className="surface table-surface"><div className="table-header"><span>Date</span><span>Transaction</span><span>Category</span><span>Amount</span><span /></div>{rows.length ? rows.map((row) => <div className="table-row" key={`${row.kind}-${row.id}`}><div className="table-date">{shortDate(row.date)}<small>{row.kind}</small></div><div><strong>{row.label}</strong><small>{row.note || (row.kind === "Income" ? "Money in" : row.payment_method)}</small></div><span className="category-tag">{row.category}</span><strong className={row.kind === "Income" ? "amount income" : "amount"}>{row.kind === "Income" ? "+" : "−"}{money(row.amount)}</strong><div className="row-actions"><button className="icon-button" onClick={() => row.kind === "Expense" ? onEditExpense(row as Expense) : onEditIncome(row as Income)} aria-label="Edit"><Settings2 size={15} /></button><button className="icon-button danger" onClick={() => row.kind === "Expense" ? onDeleteExpense(row.id) : onDeleteIncome(row.id)} aria-label="Delete"><Trash2 size={15} /></button></div></div>) : <EmptyState icon={ReceiptText} title="No transactions found" copy="Add your first expense or income record to start your ledger." />}</section></div>;
}

function Budgets({ budgets, month, setMonth, onAdd, onDelete }: { budgets: Budget[]; month: string; setMonth: (month: string) => void; onAdd: () => void; onDelete: (id: string) => void }) {
  return <div className="content-wrap"><PageHeader eyebrow="Planning" title="Budgets" copy="Give every category a boundary that feels realistic." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> New budget</button>} /><div className="month-toolbar"><button className="icon-button" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button><strong>{monthLabel(month)}</strong><button className="icon-button" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button></div><div className="management-grid">{budgets.length ? budgets.map((budget) => { const percent = Math.min(100, (budget.spent / budget.limit_amount) * 100); return <article className="management-card" key={budget.id}><div className="card-icon green"><Target size={18} /></div><div className="card-line"><strong>{budget.category}</strong><button className="icon-button danger" onClick={() => onDelete(budget.id)}><Trash2 size={15} /></button></div><div className="budget-amount">{money(budget.spent)} <small>of {money(budget.limit_amount)}</small></div><div className="progress-track"><i className={percent > 90 ? "warn" : ""} style={{ width: `${percent}%` }} /></div><small className="muted">{percent.toFixed(0)}% used</small></article>; }) : <EmptyState icon={Target} title="No budgets yet" copy="Set a limit for food, housing, or any category that matters to you." action={onAdd} actionLabel="Create first budget" />}</div></div>;
}

function Subscriptions({ items, onAdd, onDelete }: { items: Subscription[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const monthly = items.reduce((sum, item) => sum + (item.billing_cycle === "yearly" ? item.amount / 12 : item.amount), 0);
  return <div className="content-wrap"><PageHeader eyebrow="Recurring" title="Subscriptions" copy="Know what renews before it quietly leaves your account." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Add subscription</button>} /><div className="callout-card"><div className="card-icon orange"><BellRing size={18} /></div><div><span className="overline">Estimated monthly commitment</span><strong>{money(monthly)}</strong><p>{items.length ? `${items.length} recurring ${items.length === 1 ? "payment" : "payments"} tracked` : "Track streaming, software, and memberships here."}</p></div></div><div className="management-grid">{items.map((item) => <article className="management-card" key={item.id}><div className="card-icon blue"><ReceiptText size={18} /></div><div className="card-line"><strong>{item.name}</strong><button className="icon-button danger" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div><div className="budget-amount">{money(item.amount)} <small>/{item.billing_cycle === "monthly" ? "month" : "year"}</small></div><small className="muted">Next payment {shortDate(item.next_payment)}</small></article>)}</div>{!items.length && <EmptyState icon={BellRing} title="Your renewals, under control" copy="Add your first subscription to keep recurring spending visible." action={onAdd} actionLabel="Add subscription" />}</div>;
}

function SplitBills({ bills, onAdd, onSettle, onDelete }: { bills: SplitBill[]; onAdd: () => void; onSettle: (id: string) => void; onDelete: (id: string) => void }) {
  const openTotal = bills.filter((bill) => bill.status === "open").reduce((sum, bill) => sum + bill.your_share, 0);
  return <div className="content-wrap"><PageHeader eyebrow="Together" title="Split bills" copy="Keep shared expenses clear without awkward follow-ups." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Split a bill</button>} /><div className="callout-card"><div className="card-icon purple"><Users size={18} /></div><div><span className="overline">You’re owed / owe</span><strong>{money(openTotal)}</strong><p>{bills.filter((bill) => bill.status === "open").length} open split bills</p></div></div><div className="management-grid">{bills.map((bill) => <article className={`management-card ${bill.status === "settled" ? "settled" : ""}`} key={bill.id}><div className="card-icon purple"><Users size={18} /></div><div className="card-line"><strong>{bill.title}</strong><div><span className="status-chip">{bill.status}</span><button className="icon-button danger" onClick={() => onDelete(bill.id)} aria-label="Delete split bill"><Trash2 size={15} /></button></div></div><div className="budget-amount">{money(bill.your_share)} <small>your share · {bill.people_count} people</small></div><p className="muted">Total bill {money(bill.total_amount)}</p>{bill.status === "open" && <button className="text-button" onClick={() => onSettle(bill.id)}><Check size={14} /> Mark settled</button>}</article>)}</div>{!bills.length && <EmptyState icon={Users} title="No shared bills yet" copy="Split dinner, travel, and household costs in a few taps." action={onAdd} actionLabel="Split a bill" />}</div>;
}

function Advisor({ question, setQuestion, answer, busy, onAsk }: { question: string; setQuestion: (value: string) => void; answer: string; busy: boolean; onAsk: () => void }) {
  return <div className="content-wrap advisor-page"><PageHeader eyebrow="FinTrack intelligence" title="Your local advisor" copy="Ask a plain-language question and get budgeting guidance calculated from your own ledger." /><div className="advisor-card"><div className="advisor-orb"><Bot size={28} /></div><span className="overline">Private local guidance</span><h2>What would you like to understand?</h2><p>Try “Where can I trim ₹2,000 this month?” or “How much did I spend on food?”</p><div className="advisor-input"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAsk()} placeholder="Ask about your money…" /><button className="primary-button" onClick={onAsk} disabled={busy}>{busy ? "Calculating…" : "Ask advisor"} <ArrowUpRight size={16} /></button></div>{answer && <div className="advisor-answer"><Sparkles size={17} /><p>{answer}</p></div>}</div><div className="advisor-note"><Sparkles size={16} /><p><strong>Privacy note:</strong> This advisor runs locally on FinTrack’s server using only your signed-in ledger. No external API, API key, or bank credentials are used.</p></div></div>;
}

function Settings({ user, onExport }: { user: User; onExport: (format: "csv" | "pdf") => void }) {
  return <div className="content-wrap"><PageHeader eyebrow="Workspace" title="Settings" copy="Manage your account and take your data with you." /><section className="settings-grid"><article className="surface settings-card"><span className="overline">Profile</span><div className="profile-large"><span className="avatar large">{initials(user.name)}</span><div><h3>{user.name}</h3><p>{user.email}</p></div></div><div className="security-note"><Check size={15} /><span>Your account uses an encrypted, HttpOnly session cookie. Your ledger is scoped to your account.</span></div></article><article className="surface settings-card"><span className="overline">Data export</span><h3>Keep a copy of your ledger</h3><p>Download every transaction in a portable format for your own records.</p><div className="export-actions"><button className="quiet-button" onClick={() => onExport("csv")}><Download size={16} /> CSV</button><button className="quiet-button" onClick={() => onExport("pdf")}><Download size={16} /> PDF</button></div></article></section></div>;
}

function BudgetModal({ month, onClose, onSaved }: { month: string; onClose: () => void; onSaved: () => void }) {
  return <SimpleModal title="Set a budget" eyebrow="Plan ahead" onClose={onClose} endpoint="/budgets" fields={[["category", "Category", "select", EXPENSE_CATEGORIES], ["limit_amount", "Monthly limit", "number"], ["month", "Month", "month", undefined, month]]} onSaved={onSaved} submitLabel="Create budget" />;
}
function SubscriptionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return <SimpleModal title="Add subscription" eyebrow="Recurring payment" onClose={onClose} endpoint="/subscriptions" fields={[["name", "Name", "text"], ["amount", "Amount", "number"], ["billing_cycle", "Billing cycle", "select", ["monthly", "yearly"]], ["next_payment", "Next payment", "date"], ["category", "Category", "text"]]} onSaved={onSaved} submitLabel="Track subscription" />;
}
function SplitModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return <SimpleModal title="Split a bill" eyebrow="Shared expense" onClose={onClose} endpoint="/split-bills" fields={[["title", "What was it?", "text"], ["total_amount", "Total bill", "number"], ["people_count", "Number of people", "number"], ["your_share", "Your share (optional)", "number"]]} onSaved={onSaved} submitLabel="Save split bill" />;
}
function SimpleModal({ title, eyebrow, onClose, endpoint, fields, onSaved, submitLabel }: { title: string; eyebrow: string; onClose: () => void; endpoint: string; fields: [string, string, string, string[]?, string?][]; onSaved: () => void; submitLabel: string }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); try { const raw = Object.fromEntries(new FormData(event.currentTarget).entries()); const data = { ...raw, ...(raw.amount ? { amount: Number(raw.amount) } : {}), ...(raw.limit_amount ? { limit_amount: Number(raw.limit_amount) } : {}), ...(raw.total_amount ? { total_amount: Number(raw.total_amount) } : {}), ...(raw.people_count ? { people_count: Number(raw.people_count) } : {}), ...(raw.your_share ? { your_share: Number(raw.your_share) } : {}) }; await api(endpoint, { method: "POST", body: JSON.stringify(data) }); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); } finally { setBusy(false); } }
  return <Modal title={title} eyebrow={eyebrow} onClose={onClose}><form onSubmit={submit} className="form-stack modal-form">{fields.map(([name, label, type, options, defaultValue]) => <label key={name}>{label}{type === "select" ? <select name={name} defaultValue={defaultValue ?? options?.[0]}>{options?.map((option) => <option key={option}>{option}</option>)}</select> : <input name={name} type={type} min={type === "number" ? "0.01" : undefined} step={type === "number" ? "0.01" : undefined} defaultValue={defaultValue ?? (name === "next_payment" ? currentDate() : "")} required={name !== "your_share"} />}</label>)}{error && <p className="form-error">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? "Saving…" : submitLabel}</button></form></Modal>;
}

function EmptyState({ icon: Icon, title, copy, action, actionLabel }: { icon: ElementType; title: string; copy: string; action?: () => void; actionLabel?: string }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon size={21} /></span><h3>{title}</h3><p>{copy}</p>{action && <button className="quiet-button" onClick={action}><Plus size={15} />{actionLabel}</button>}</div>;
}

export default App;