import React from 'react';
import { PlusCircle, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { usePageTitle } from '../context/PageTitleContext';
import { useSettings } from '../context/SettingsContext';
import API from '../api/api';
import { getSummary, setSummary } from '../data/summaryRepo';
import { listRecurringRules } from '../data/recurringRepo';

const CATEGORY_EMOJI = {
  Food: '🍽️',
  Transport: '🚕',
  Shopping: '🛍️',
  Equipment: '🧰',
  Software: '💻',
  Entertainment: '🎬',
  Utilities: '⚡',
  Housing: '🏠',
  Health: '🖤',
  Other: '📌',
};

const METRIC_ACCENTS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function Sparkline({ values = [], color = '#3b82f6' }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? 0 : (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 32" width="100%" height="30" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function Donut({ rows = [] }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const parts = rows.map((r, i) => {
    const start = rows
      .slice(0, i)
      .reduce((s, x) => s + (x.value / total) * 100, 0);
    const end = start + (r.value / total) * 100;
    return `${r.color || METRIC_ACCENTS[i % METRIC_ACCENTS.length]} ${start}% ${end}%`;
  });

  return (
    <div
      style={{
        width: '94px',
        height: '94px',
        borderRadius: '50%',
        background: `conic-gradient(${parts.join(', ')})`,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '14px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
        }}
      />
    </div>
  );
}

const Dashboard = () => {
  usePageTitle('Dashboard');

  const navigate = useNavigate();
  const { currencySymbol, theme, currency } = useSettings();

  const [loading, setLoading] = React.useState(true);
  const [summary, setSummaryState] = React.useState({ balance: 4250, income: 3200, credit: 450 });
  const [expenses, setExpenses] = React.useState([]);
  const [recurring, setRecurring] = React.useState([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ balance: '4250', income: '3200' });

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, e, r] = await Promise.all([
          getSummary(),
          API.get('/expenses'),
          listRecurringRules(),
        ]);

        setSummaryState(s);
        setEditForm({
          balance: String(s.balance ?? 0),
          income: String(s.income ?? 0),
        });

        const list = Array.isArray(e?.expenses) ? e.expenses : (Array.isArray(e?.data) ? e.data : []);
        setExpenses([...list].sort((a, b) => new Date(b.date) - new Date(a.date)));

        setRecurring((Array.isArray(r) ? r : []).filter((x) => x.active));
      } finally {
        setLoading(false);
      }
    };

    load().catch(console.error);
  }, [currency]);

  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = expenses.filter((e) => new Date(e.date) >= monthStart);
  const monthSpend = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const balance = Number(summary.income || 0) - monthSpend;

  const byCategory = monthExpenses.reduce((acc, e) => {
    const k = e.category || 'Other';
    acc[k] = (acc[k] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  const categoryRows = Object.entries(byCategory)
    .map(([name, value], i) => ({ name, value, color: ['#5b56c7', '#1fa37f', '#f3a530', '#3b82f6'][i % 4] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const categoryTotal = categoryRows.reduce((s, r) => s + r.value, 0) || 1;

  const recent = expenses.slice(0, 3);
  const expenseSeries = monthExpenses.slice(-6).map((e) => Number(e.amount || 0));
  const incomeSeries = [summary.income * 0.78, summary.income * 0.82, summary.income * 0.86, summary.income * 0.9, summary.income * 0.94, summary.income];
  const balanceSeries = [balance * 0.86, balance * 0.88, balance * 0.84, balance * 0.95, balance * 0.97, balance];

  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayIndex = now.getDate();
  const monthProgress = clamp(Math.round((dayIndex / monthDays) * 100), 0, 100);

  const savingsRate = summary.income > 0 ? clamp(Math.round(((summary.income - monthSpend) / summary.income) * 100), -100, 100) : 0;
  const projectedTotal = dayIndex > 0 ? Math.round((monthSpend / dayIndex) * monthDays) : 0;

  const upcoming = [...recurring]
    .sort((a, b) => String(a.nextRunAt).localeCompare(String(b.nextRunAt)))
    .slice(0, 2);

  const totalDue = upcoming.reduce((s, r) => s + Number(r.amount || 0), 0);

  const isDark = theme === 'dark';
  const surface = 'var(--surface-1)';
  const surfaceSoft = 'var(--surface-soft)';
  const surfaceStrong = 'var(--surface-3)';
  const divider = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.2)';

  const openEdit = () => {
    setEditForm({
      balance: String(summary.balance ?? 0),
      income: String(summary.income ?? 0),
    });
    setEditOpen(true);
  };

  const saveSummary = async (e) => {
    e.preventDefault();
    const payload = {
      balance: Number(editForm.balance || 0),
      income: Number(editForm.income || 0),
      credit: Number(summary.credit || 0),
    };
    const updated = await setSummary(payload);
    setSummaryState(updated);
    setEditOpen(false);
  };

  const metricCards = [
    {
      label: 'BALANCE',
      value: balance,
      chip: '▲ 2.4% vs last month',
      color: '#3b82f6',
      series: balanceSeries,
    },
    {
      label: 'EXPENSES',
      value: monthSpend,
      chip: '▲ 5.2% vs last month',
      chipTone: 'danger',
      color: '#ef4444',
      series: expenseSeries,
    },
    {
      label: 'INCOME',
      value: Number(summary.income || 0),
      chip: '▲ 1.1% vs last month',
      chipTone: 'success',
      color: '#10b981',
      series: incomeSeries,
    },
  ];

  return (
    <div>
      <div className="page-header page-header-desktop" style={{ marginBottom: '0.8rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back - here's your financial overview · {monthName}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem' }}>
          <Button variant="secondary" size="sm" onClick={openEdit}>Edit summary</Button>
          <Button size="sm" icon={<PlusCircle size={14} />} onClick={() => navigate('/add-expense')}>Add expense</Button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: '0.85rem' }}>
        {metricCards.map((m) => (
          <div key={m.label} style={{ border: '1px solid var(--glass-border)', borderLeft: `3px solid ${m.color}`, borderRadius: '12px', background: surface, padding: '0.82rem 0.85rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 800, letterSpacing: '0.06em' }}>{m.label}</p>
            <p style={{ fontSize: '2rem', lineHeight: 1.05, margin: '0.15rem 0 0.3rem', fontWeight: 700 }}>{currencySymbol}{Math.round(m.value).toLocaleString('en-IN')}</p>

            <span style={{ display: 'inline-block', fontSize: '0.74rem', borderRadius: '999px', padding: '0.18rem 0.48rem', background: m.chipTone === 'danger' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: m.chipTone === 'danger' ? '#b91c1c' : '#2f7a20' }}>
              {m.chip}
            </span>
            <div style={{ marginTop: '0.35rem' }}>
              <Sparkline values={m.series} color={m.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="responsive-grid" style={{ gap: '0.72rem', marginBottom: '0.72rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.72rem' }}>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: surface, padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 500 }}>Recent transactions</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate('/expenses')}>View all →</Button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[1, 2, 3].map((x) => <div key={x} className="skeleton" style={{ height: '62px', borderRadius: '10px' }} />)}
              </div>
            ) : recent.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.2rem 0' }}>No transactions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.46rem' }}>
                {recent.map((exp) => {
                  const icon = CATEGORY_EMOJI[exp.category] || '📌';
                  return (
                    <div key={exp._id || exp.id} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto auto', gap: '0.6rem', alignItems: 'center', borderBottom: `1px solid ${divider}`, paddingBottom: '0.5rem' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(139,92,246,0.13)', display: 'grid', placeItems: 'center' }}>{icon}</div>
                      <div>
                        <p style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{exp.title}</p>
                        <p style={{ fontSize: '0.92rem', color: 'var(--text-sub)' }}>
                          {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · {exp.category || 'Other'}
                        </p>
                      </div>
                      <p style={{ color: '#b91c1c', fontSize: '1.2rem' }}>-{currencySymbol}{Number(exp.amount || 0).toLocaleString('en-IN')}</p>
                      <button
                        type="button"
                        onClick={() => navigate('/add-expense', { state: { mode: 'edit', expense: exp } })}
                        style={{ width: '38px', height: '38px', borderRadius: '9px', border: '1px solid var(--glass-border)', background: surfaceStrong, color: 'var(--text-sub)' }}
                        aria-label="Edit transaction"
                      >
                        ✎
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: surface, padding: '0.9rem' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 500, marginBottom: '0.75rem' }}>Spending by category</h3>
            {categoryRows.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No category data this month yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.8rem', alignItems: 'center' }}>
                <Donut rows={categoryRows} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {categoryRows.map((r) => (
                    <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-sub)' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: r.color }} /> {r.name}
                      </span>
                      <span style={{ color: 'var(--text-main)' }}>{Math.round((r.value / categoryTotal) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.72rem' }}>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: surface, padding: '0.9rem' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 500, marginBottom: '0.65rem' }}>Smart insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.48rem' }}>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', background: surfaceSoft, padding: '0.55rem' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', letterSpacing: '0.06em' }}>THIS MONTH SPEND</p>
                <p style={{ fontSize: '1.65rem', fontWeight: 700 }}>{currencySymbol}{Math.round(monthSpend).toLocaleString('en-IN')}</p>
                <p style={{ fontSize: '0.86rem', color: '#b45309' }}>Pace: accelerating</p>
              </div>

              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', background: surfaceSoft, padding: '0.55rem' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', letterSpacing: '0.06em' }}>MONEY LEFT</p>
                <p style={{ fontSize: '1.65rem', fontWeight: 700 }}>{currencySymbol}{Math.max(0, Math.round(summary.income - monthSpend)).toLocaleString('en-IN')}</p>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>After recurring & savings</p>
              </div>

              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', background: surfaceSoft, padding: '0.55rem' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', letterSpacing: '0.06em' }}>SAVINGS RATE</p>
                <p style={{ fontSize: '1.65rem', fontWeight: 700, color: '#059669' }}>{savingsRate}%</p>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Excellent - keep it up</p>
              </div>

              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', background: surfaceSoft, padding: '0.55rem' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', letterSpacing: '0.06em' }}>PREDICTED TOTAL</p>
                <p style={{ fontSize: '1.65rem', fontWeight: 700 }}>{currencySymbol}{projectedTotal.toLocaleString('en-IN')}</p>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Day {dayIndex} of {monthDays}</p>
              </div>
            </div>

            <div style={{ marginTop: '0.72rem' }}>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-sub)', marginBottom: '0.2rem' }}>Month progress - Day {dayIndex} of {monthDays}</p>
              <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(100,116,139,0.24)' }}>
                <div style={{ height: '100%', width: `${monthProgress}%`, borderRadius: '999px', background: '#2b6cb0' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>{currencySymbol}{Math.round(monthSpend).toLocaleString('en-IN')} spent</span>
                <span>{currencySymbol}{Math.round(summary.income).toLocaleString('en-IN')} income</span>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: surface, padding: '0.9rem' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 500, marginBottom: '0.65rem' }}>Upcoming recurring</h3>

            {upcoming.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recurring rules active.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {upcoming.map((r, i) => {
                  const dt = new Date(r.nextRunAt);
                  const days = Math.max(0, Math.ceil((dt - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / (1000 * 60 * 60 * 24)));
                  return (
                    <div key={r.id || `${r.title}-${i}`} style={{ borderBottom: `1px solid ${divider}`, paddingBottom: '0.45rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: i === 0 ? '#f59e0b' : '#10b981' }} />
                        <strong style={{ fontSize: '1.1rem', fontWeight: 600 }}>{r.title}</strong>
                      </div>
                      <p style={{ color: 'var(--text-sub)', fontSize: '0.94rem' }}>{dt.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' })} · in {days} days</p>
                    </div>
                  );
                })}

                <p style={{ marginTop: '0.35rem', fontSize: '1.1rem' }}>Total due in {now.toLocaleDateString('en-US', { month: 'long' })} <strong>{currencySymbol}{Math.round(totalDue).toLocaleString('en-IN')}</strong></p>
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setEditOpen(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '420px', border: '1px solid var(--glass-border)', borderRadius: '14px', background: isDark ? '#0b1220' : 'var(--bg-secondary)', padding: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Edit summary</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Update values displayed in top metric cards.</p>

            <form onSubmit={saveSummary} style={{ display: 'flex', flexDirection: 'column', gap: '0.58rem' }}>
              {[
                ['Balance', 'balance'],
                ['Income', 'income'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.86rem', color: 'var(--text-sub)' }}>
                    {label} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={editForm[key]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.58rem 0.68rem', borderRadius: '9px', border: '1px solid var(--glass-border)', background: surfaceStrong, color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
