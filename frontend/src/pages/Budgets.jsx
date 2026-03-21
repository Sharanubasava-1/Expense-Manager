import React from 'react';
import { Trash2 } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useSettings } from '../context/SettingsContext';
import { deleteBudget, getBudgetsForMonth, upsertBudget } from '../data/budgetsRepo';
import { listExpenses } from '../data/expensesRepo';

const CATEGORIES = ['All', 'Food', 'Transport', 'Shopping', 'Equipment', 'Software', 'Other'];

const ymNow = () => new Date().toISOString().slice(0, 7);

export default function Budgets() {
  usePageTitle('Budgets');

  const [month, setMonth] = React.useState(ymNow());
  const [budgets, setBudgets] = React.useState([]);
  const [monthExpenses, setMonthExpenses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ category: 'All', limit: '', spent: '' });
  const [error, setError] = React.useState('');
  const settings = useSettings();

  const monthLabel = React.useMemo(() => {
    const [y, m] = String(month).split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }, [month]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [b, allExpenses] = await Promise.all([
        getBudgetsForMonth(month),
        listExpenses(),
      ]);
      const monthFiltered = allExpenses.filter((e) => String(e.date || '').slice(0, 7) === month);
      setBudgets(b);
      setMonthExpenses(monthFiltered);
    } finally {
      setLoading(false);
    }
  }, [month]);

  React.useEffect(() => {
    load().catch(console.error);
  }, [load, settings.currency]);

  const onAdd = async (e) => {
    e.preventDefault();
    setError('');
    const limit = Number(form.limit);
    if (!limit || limit <= 0) {
      setError('Enter a valid limit.');
      return;
    }
    await upsertBudget({
      month,
      category: form.category === 'All' ? null : form.category,
      limit,
    });
    setForm({ category: form.category, limit: '', spent: '' });
    await load();
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    await deleteBudget(id);
    await load();
  };

  const totalLimit = budgets.reduce((sum, b) => sum + (Number(b.limit) || 0), 0);
  const spentSoFar = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remaining = Math.max(totalLimit - spentSoFar, 0);
  const usedPct = totalLimit > 0 ? Math.min(100, (spentSoFar / totalLimit) * 100) : 0;

  const daysLeftText = React.useMemo(() => {
    const now = new Date();
    const [year, mon] = String(month).split('-').map(Number);
    if (now.getFullYear() === year && now.getMonth() + 1 === mon) {
      const end = new Date(year, mon, 0);
      const days = Math.max(0, Math.ceil((end - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / (1000 * 60 * 60 * 24)));
      return `${days} day${days === 1 ? '' : 's'} left`;
    }
    return monthLabel;
  }, [month, monthLabel]);

  const spentByCategory = React.useMemo(() => {
    return monthExpenses.reduce((acc, e) => {
      const key = e.category || 'Other';
      acc[key] = (acc[key] || 0) + (Number(e.amount) || 0);
      return acc;
    }, {});
  }, [monthExpenses]);

  const panelStyle = {
    border: '1px solid var(--glass-border)',
    borderRadius: '14px',
    background: 'var(--surface-1)',
    padding: '1.05rem',
  };

  const fieldStyle = {
    width: '100%',
    padding: '0.66rem 0.78rem',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    background: 'var(--surface-2)',
    color: 'var(--text-main)',
    fontSize: '1.02rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.28rem',
    fontSize: '0.72rem',
    color: 'var(--text-sub)',
    fontWeight: 700,
    letterSpacing: '0.01em',
  };

  return (
    <div>
      <div className="page-header page-header-desktop">
        <div>
          <h1>Budgets</h1>
          <p>Set monthly limits and get alerts when you’re close.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3, minmax(0, 1fr))', marginBottom:'1rem' }}>
        {[
          { label: 'TOTAL LIMIT', value: totalLimit, sub: monthLabel, dot: '#17a974' },
          { label: 'SPENT SO FAR', value: spentSoFar, sub: `${Math.round(usedPct)}% used`, dot: '#2977c9' },
          { label: 'REMAINING', value: remaining, sub: daysLeftText, dot: '#17a974' },
        ].map((k) => (
          <div key={k.label} style={{ ...panelStyle, minHeight:'88px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
              <p style={{ fontSize:'0.72rem', letterSpacing:'0.06em', color:'var(--text-sub)', fontWeight:800 }}>{k.label}</p>
              <span style={{ width:'10px', height:'10px', borderRadius:'999px', background:k.dot }} />
            </div>
            <p style={{ fontSize:'2rem', lineHeight:1, fontWeight:700, marginBottom:'0.32rem' }}>{settings.currencySymbol}{Number(k.value).toLocaleString()}</p>
            <p style={{ fontSize:'0.78rem', color:'var(--text-sub)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="responsive-grid-equal" style={{ alignItems:'start' }}>
        <section style={panelStyle}>
          <h3 style={{ fontSize:'1.02rem', fontWeight:700, marginBottom:'0.95rem' }}>Create budget</h3>
          <form onSubmit={onAdd}>
            {error && (
              <div style={{ marginBottom:'0.75rem', padding:'0.55rem 0.7rem', borderRadius:'10px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'var(--danger)', fontSize:'0.8rem' }}>
                {error}
              </div>
            )}

            <div style={{ display:'grid', gap:'0.75rem', gridTemplateColumns:'1fr 1fr', marginBottom:'0.75rem' }}>
              <div>
                <label style={labelStyle}>Month</label>
                <input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  style={fieldStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All spending' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gap:'0.75rem', gridTemplateColumns:'1fr 1fr', marginBottom:'0.75rem' }}>
              <div>
                <label style={labelStyle}>Limit ({settings.currencySymbol})</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.limit}
                  onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
                  required
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Spent so far ({settings.currencySymbol})</label>
                <input
                  type="number"
                  placeholder="e.g. 2000"
                  value={form.spent}
                  onChange={(e) => setForm((f) => ({ ...f, spent: e.target.value }))}
                  style={fieldStyle}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width:'100%', padding:'0.64rem 0.8rem', borderRadius:'10px', border:'1px solid var(--glass-border)', background:'var(--surface-3)', color:'var(--text-main)', fontWeight:800, fontSize:'1.02rem' }}
            >
              Add budget
            </button>
          </form>
        </section>

        <section style={panelStyle}>
          <h3 style={{ fontSize:'1.02rem', fontWeight:700, marginBottom:'0.95rem' }}>This month&apos;s budgets</h3>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height:'68px', borderRadius:'10px' }} />)}
            </div>
          ) : budgets.length === 0 ? (
            <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2.8rem 0 2.2rem', fontSize:'1.02rem' }}>
              No budgets yet - add one to get started.
            </p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem' }}>
              {budgets.map((b) => {
                const category = b.category || 'Overall';
                const spent = category === 'Overall' ? spentSoFar : Number(spentByCategory[category] || 0);
                const pct = Number(b.limit) > 0 ? Math.min(100, (spent / Number(b.limit)) * 100) : 0;

                return (
                  <div key={b.id} style={{ border:'1px solid var(--glass-border)', borderRadius:'11px', padding:'0.65rem 0.75rem', background:'var(--chip-bg)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                      <div>
                        <p style={{ fontSize:'0.92rem', fontWeight:800 }}>{category}</p>
                        <p style={{ fontSize:'0.74rem', color:'var(--text-sub)' }}>{settings.currencySymbol}{spent.toFixed(0)} / {settings.currencySymbol}{Number(b.limit).toFixed(0)}</p>
                      </div>
                      <button
                        onClick={() => onDelete(b.id)}
                        aria-label="Delete budget"
                        style={{ border:'1px solid var(--glass-border)', background:'var(--chip-bg-strong)', color:'var(--text-muted)', borderRadius:'8px', width:'34px', height:'34px', display:'grid', placeItems:'center' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div style={{ marginTop:'0.45rem', height:'6px', borderRadius:'999px', background:'rgba(100,116,139,0.18)', overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background: pct > 90 ? '#ef4444' : '#2383d8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}