import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import {
  type Expense,
  type ExpenseInput,
  type ExpenseUpdate,
  getGetDashboardQueryKey,
  getListExpensesQueryKey,
  useCreateExpense,
  useDeleteExpense,
  useGetDashboard,
  useListExpenses,
  useUpdateExpense,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const CATEGORY_OPTIONS = ['Food & drink', 'Home', 'Transport', 'Shopping', 'Health', 'Fun', 'Bills', 'Other'];
const PAYMENT_OPTIONS = ['UPI', 'Debit card', 'Credit card', 'Bank transfer', 'Cash'];

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(`${month}-02T12:00:00`));
}

function shiftMonth(month: string, amount: number) {
  const date = new Date(`${month}-02T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function todayMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysInMonth(month: string) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return date.getDate();
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));
}

function StatCard({ label, value, detail, tone = 'plain' }: { label: string; value: string; detail: string; tone?: 'plain' | 'warm' }) {
  return (
    <article className={`stat-card ${tone === 'warm' ? 'stat-card-warm' : ''}`} data-testid={`card-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <span className="eyebrow">{label}</span>
      <strong data-testid={`value-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

function SkeletonDashboard() {
  return (
    <div className="dashboard-grid" data-testid="loading-dashboard" aria-label="Loading your month">
      <div className="skeleton loading-hero" />
      <div className="skeleton loading-chart" />
      <div className="skeleton loading-list" />
    </div>
  );
}

type FormState = {
  amount: string;
  description: string;
  category: string;
  date: string;
  payment_method: string;
  note: string;
};

function initialForm(expense?: Expense): FormState {
  return {
    amount: expense ? String(expense.amount) : '',
    description: expense?.description ?? '',
    category: expense?.category ?? CATEGORY_OPTIONS[0],
    date: expense?.date ?? todayDate(),
    payment_method: expense?.payment_method ?? PAYMENT_OPTIONS[0],
    note: expense?.note ?? '',
  };
}

function ExpenseModal({
  expense,
  busy,
  onClose,
  onSubmit,
}: {
  expense?: Expense;
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseInput | ExpenseUpdate) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialForm(expense));
  const [error, setError] = useState('');
  const isEditing = Boolean(expense);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError('Add an amount greater than zero.');
      return;
    }
    if (!form.description.trim()) {
      setError('Give this expense a short description.');
      return;
    }
    if (!form.category || !form.date) {
      setError('Choose a category and date.');
      return;
    }
    setError('');
    onSubmit({
      amount,
      description: form.description.trim(),
      category: form.category,
      date: form.date,
      payment_method: form.payment_method,
      note: form.note.trim(),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="expense-modal rise-in" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{isEditing ? 'Edit entry' : 'New entry'}</span>
            <h2 id="expense-modal-title" className="font-display">{isEditing ? 'Make it more accurate' : 'What did you spend?'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close expense form" data-testid="button-close-expense-form"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="amount-field">
            <span className="currency-symbol">₹</span>
            <input autoFocus inputMode="decimal" value={form.amount} onChange={(event) => update('amount', event.target.value)} placeholder="0.00" aria-label="Amount" data-testid="input-expense-amount" />
          </div>
          <label className="field-label">Description
            <input value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Coffee with Maya" data-testid="input-expense-description" />
          </label>
          <div className="field-row">
            <label className="field-label">Date
              <span className="input-with-icon"><CalendarDays size={16} /><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} data-testid="input-expense-date" /></span>
            </label>
            <label className="field-label">Payment
              <select value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)} data-testid="select-expense-payment">
                {PAYMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="category-field">
            <legend className="field-label">Category</legend>
            <div className="category-pills">
              {CATEGORY_OPTIONS.map((option) => (
                <button className={`category-pill ${form.category === option ? 'selected' : ''}`} type="button" key={option} onClick={() => update('category', option)} aria-pressed={form.category === option} data-testid={`button-category-${option.toLowerCase().replaceAll(' ', '-')}`}>{option}</button>
              ))}
            </div>
          </fieldset>
          <label className="field-label">Note <span className="optional">optional</span>
            <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="A little context for future you" rows={2} data-testid="textarea-expense-note" />
          </label>
          {error && <p className="form-error" role="alert" data-testid="status-form-error">{error}</p>}
          <div className="modal-actions">
            <button className="button button-quiet" type="button" onClick={onClose} data-testid="button-cancel-expense">Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy} data-testid="button-save-expense">{busy ? 'Saving…' : isEditing ? 'Save changes' : 'Save entry'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Dashboard() {
  const [month, setMonth] = useState(todayMonth);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [notice, setNotice] = useState('');
  const queryClientInstance = useQueryClient();
  const listParams = useMemo(() => ({ month, ...(category ? { category } : {}), ...(search.trim() ? { q: search.trim() } : {}) }), [month, category, search]);
  const dashboardParams = useMemo(() => ({ month }), [month]);
  const expensesQuery = useListExpenses(listParams);
  const dashboardQuery = useGetDashboard(dashboardParams);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const expenses = expensesQuery.data ?? [];
  const summary = dashboardQuery.data;
  const categories = useMemo(() => summary?.category_spend.map((item) => item.category) ?? [], [summary]);

  function refresh() {
    queryClientInstance.invalidateQueries({ queryKey: getListExpensesQueryKey(listParams) });
    queryClientInstance.invalidateQueries({ queryKey: getGetDashboardQueryKey(dashboardParams) });
  }

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  }

  function saveExpense(data: ExpenseInput | ExpenseUpdate) {
    if (modal.expense) {
      updateExpense.mutate({ expenseId: modal.expense.id, data }, {
        onSuccess: () => {
          setModal({ open: false });
          refresh();
          announce('Entry updated');
        },
        onError: () => announce('Could not update that entry. Try again.'),
      });
    } else {
      createExpense.mutate({ data: data as ExpenseInput }, {
        onSuccess: () => {
          setModal({ open: false });
          refresh();
          announce('Entry saved');
        },
        onError: () => announce('Could not save that entry. Try again.'),
      });
    }
  }

  function removeExpense(expense: Expense) {
    if (!window.confirm(`Delete “${expense.description}”?`)) return;
    deleteExpense.mutate({ expenseId: expense.id }, {
      onSuccess: () => {
        refresh();
        announce('Entry deleted');
      },
      onError: () => announce('Could not delete that entry. Try again.'),
    });
  }

  const change = summary?.change_percent ?? null;
  const maxDaily = Math.max(...(summary?.daily_spend.map((day) => day.total) ?? [1]), 1);
  const maxCategory = Math.max(...(summary?.category_spend.map((item) => item.total) ?? [1]), 1);

  return (
    <div className="app-shell grain">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Leaf size={18} /></div><div><strong>pennywise</strong><span>your money notebook</span></div></div>
        <div className="topbar-right"><span className="quiet-greeting">A little clarity, every day.</span><div className="profile-mark">AM</div></div>
      </header>
      <main className="page-wrap">
        <section className="page-heading rise-in">
          <div>
            <span className="eyebrow">Monthly view</span>
            <h1 className="font-display" data-testid="heading-month">{monthLabel(month)}</h1>
            <p>Notice where your money went. No judgment attached.</p>
          </div>
          <button className="button button-primary add-button" onClick={() => setModal({ open: true })} data-testid="button-add-expense"><Plus size={18} /> Add expense</button>
        </section>
        <div className="month-switcher rise-in delay-1">
          <button className="icon-button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" data-testid="button-previous-month"><ChevronLeft size={18} /></button>
          <span data-testid="text-selected-month">{monthLabel(month)}</span>
          <button className="icon-button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" data-testid="button-next-month"><ChevronRight size={18} /></button>
          {month !== todayMonth() && <button className="today-link" onClick={() => setMonth(todayMonth())} data-testid="button-return-to-current-month">Today</button>}
        </div>

        {dashboardQuery.isLoading ? <SkeletonDashboard /> : dashboardQuery.isError ? (
          <div className="state-panel" data-testid="status-dashboard-error"><Receipt size={27} /><h2>We couldn't open this month.</h2><p>Your entries are safe. Please try once more.</p><button className="button button-primary" onClick={() => dashboardQuery.refetch()} data-testid="button-retry-dashboard">Try again</button></div>
        ) : summary ? (
          <>
            <section className="stat-grid rise-in delay-1">
              <StatCard label="Spent this month" value={money(summary.total)} detail={change === null ? 'No comparison yet' : `${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'more' : 'less'} than last month`} tone="warm" />
              <StatCard label="Daily average" value={money(summary.total / daysInMonth(month))} detail={`${summary.transaction_count} ${summary.transaction_count === 1 ? 'entry' : 'entries'} logged`} />
              <StatCard label="Biggest category" value={summary.category_spend[0]?.category ?? 'Not yet'} detail={summary.category_spend[0] ? money(summary.category_spend[0].total) : 'Your first entry starts the picture'} />
            </section>
            <section className="insight-grid rise-in delay-2">
              <article className="panel rhythm-panel">
                <div className="panel-heading"><div><span className="eyebrow">The rhythm</span><h2>Spending by day</h2></div><CalendarDays size={19} /></div>
                {summary.daily_spend.length ? <div className="bars" data-testid="chart-daily-spend">
                  {summary.daily_spend.slice(-14).map((day) => <div className="bar-column" key={day.date}><span className="bar-value">{money(day.total)}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(5, (day.total / maxDaily) * 100)}%` }} /></div><span className="bar-label">{formatDay(day.date)}</span></div>)}
                </div> : <EmptyInsight text="Your daily rhythm will appear here as you add entries." />}
              </article>
              <article className="panel category-panel">
                <div className="panel-heading"><div><span className="eyebrow">The shape</span><h2>Where it goes</h2></div><WalletCards size={19} /></div>
                {summary.category_spend.length ? <div className="category-list" data-testid="list-category-spend">{summary.category_spend.slice(0, 5).map((item, index) => <div className="category-row" key={item.category}><div className={`category-dot dot-${index}`} /><div className="category-info"><div><span>{item.category}</span><strong>{money(item.total)}</strong></div><div className="category-track"><div style={{ width: `${(item.total / maxCategory) * 100}%` }} /></div></div></div>)}</div> : <EmptyInsight text="Categories will take shape after your first entry." />}
              </article>
            </section>
          </>
        ) : null}

        <section className="history-section rise-in delay-3">
          <div className="history-heading"><div><span className="eyebrow">Your entries</span><h2>Transaction history</h2></div><span className="entry-count" data-testid="text-transaction-count">{summary?.transaction_count ?? 0} total</span></div>
          <div className="filter-row">
            <label className="search-box"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entries" aria-label="Search entries" data-testid="input-search-expenses" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}</label>
            <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category" data-testid="select-filter-category"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            {(search || category) && <button className="clear-filter" onClick={() => { setSearch(''); setCategory(''); }} data-testid="button-clear-filters">Clear filters</button>}
          </div>
          {expensesQuery.isLoading ? <div className="history-panel"><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></div> : expensesQuery.isError ? <div className="history-empty" data-testid="status-expenses-error"><p>Entries took a moment to load.</p><button className="button button-quiet" onClick={() => expensesQuery.refetch()} data-testid="button-retry-expenses">Try again</button></div> : expenses.length ? <div className="history-panel" data-testid="list-expenses">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={() => setModal({ open: true, expense })} onDelete={() => removeExpense(expense)} />)}</div> : <div className="history-empty" data-testid="status-expenses-empty"><div className="empty-icon"><Receipt size={22} /></div><h3>{search || category ? 'No matching entries' : 'A blank page is a good place to start'}</h3><p>{search || category ? 'Try a different search or clear the filter.' : 'Keep it simple. Add the first thing you spent money on this month.'}</p>{search || category ? <button className="button button-quiet" onClick={() => { setSearch(''); setCategory(''); }} data-testid="button-empty-clear-filters">Clear filters</button> : <button className="button button-primary" onClick={() => setModal({ open: true })} data-testid="button-empty-add-expense"><Plus size={17} /> Add first expense</button>}</div>}
        </section>
      </main>
      {notice && <div className="toast-message" role="status" data-testid="status-action-feedback">{notice}<span className="toast-check">✓</span></div>}
      {modal.open && <ExpenseModal expense={modal.expense} busy={createExpense.isPending || updateExpense.isPending} onClose={() => setModal({ open: false })} onSubmit={saveExpense} />}
    </div>
  );
}

function EmptyInsight({ text }: { text: string }) {
  return <div className="insight-empty"><MoreHorizontal size={20} /><p>{text}</p></div>;
}

function ExpenseRow({ expense, onEdit, onDelete }: { expense: Expense; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="expense-row" data-testid={`row-expense-${expense.id}`}>
      <div className="expense-date"><span>{shortDate(expense.date)}</span><small>{expense.payment_method}</small></div>
      <div className="expense-main"><strong data-testid={`text-expense-description-${expense.id}`}>{expense.description}</strong><span className="expense-category">{expense.category}</span>{expense.note && <small>{expense.note}</small>}</div>
      <strong className="expense-amount" data-testid={`text-expense-amount-${expense.id}`}>{money(expense.amount)}</strong>
      <div className="row-actions"><button className="row-action" onClick={onEdit} aria-label={`Edit ${expense.description}`} data-testid={`button-edit-expense-${expense.id}`}><Pencil size={15} /></button><button className="row-action danger" onClick={onDelete} aria-label={`Delete ${expense.description}`} data-testid={`button-delete-expense-${expense.id}`}><Trash2 size={15} /></button></div>
    </article>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Dashboard} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;