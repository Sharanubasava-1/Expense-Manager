import React from 'react';
import { Trash2 } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useSettings } from '../context/SettingsContext';
import {
  deleteRecurringRule,
  listRecurringRules,
  setRecurringRuleActive,
  upsertRecurringRule,
} from '../data/recurringRepo';

const CATEGORIES = ['Food','Transport','Shopping','Equipment','Software','Other'];
const CADENCE_OPTIONS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const isoDay = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

const toApiCadence = (cadence) => (cadence === 'weekly' ? 'weekly' : 'monthly');

const cadenceMultiplierMonthly = (cadence) => {
  if (cadence === 'weekly') return 52 / 12;
  return 1;
};

const cadenceMultiplierYearly = (cadence) => {
  if (cadence === 'weekly') return 52;
  return 12;
};

const categoryEmoji = {
  Food: '🍽️',
  Transport: '🚌',
  Shopping: '🛍️',
  Equipment: '🧰',
  Software: '💻',
  Other: '🧾',
};

export default function Recurring() {
  usePageTitle('Recurring');
  const { currencySymbol, currency } = useSettings();

  const [rules, setRules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('active');
  const [form, setForm] = React.useState({
    title: '',
    amount: '',
    category: 'Other',
    notes: '',
    cadence: 'monthly',
    nextRunAt: isoDay(),
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setRules(await listRecurringRules());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load().catch(console.error);
  }, [load, currency]);

  const addRule = async (e) => {
    e.preventDefault();

    const amount = Number(form.amount);
    if (!form.title.trim() || !amount || amount <= 0) return;

    const nextDate = new Date(form.nextRunAt);
    const apiCadence = toApiCadence(form.cadence);

    await upsertRecurringRule({
      title: form.title.trim(),
      amount,
      category: form.category,
      notes: form.notes,
      cadence: apiCadence,
      dayOfMonth: apiCadence === 'monthly' ? nextDate.getDate() : undefined,
      dayOfWeek: apiCadence === 'weekly' ? nextDate.getDay() : undefined,
      nextRunAt: form.nextRunAt,
      active: true,
    });
    setForm((f) => ({ ...f, title: '', amount: '', notes: '' }));
    await load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this recurring rule?')) return;
    await deleteRecurringRule(id);
    await load();
  };

  const toggle = async (r) => {
    await setRecurringRuleActive(r.id, !r.active);
    await load();
  };

  const now = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);

  const activeRules = rules.filter((r) => r.active);
  const dueThisWeek = activeRules.filter((r) => {
    const d = new Date(r.nextRunAt);
    return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= in7;
  });

  const monthlyTotal = activeRules.reduce((sum, r) => {
    return sum + Number(r.amount || 0) * cadenceMultiplierMonthly(r.cadence);
  }, 0);

  const annualEstimate = activeRules.reduce((sum, r) => {
    return sum + Number(r.amount || 0) * cadenceMultiplierYearly(r.cadence);
  }, 0);

  const dueWeekAmount = dueThisWeek.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const shownRules = activeTab === 'active'
    ? activeRules
    : [...activeRules].sort((a, b) => String(a.nextRunAt).localeCompare(String(b.nextRunAt)));

  const fieldStyle = {
    width: '100%',
    padding: '0.64rem 0.74rem',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    background: 'var(--surface-2)',
    color: 'var(--text-main)',
    fontSize: '0.98rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const panelStyle = {
    border: '1px solid var(--glass-border)',
    borderRadius: '14px',
    background: 'var(--surface-1)',
    padding: '1.05rem',
  };

  const metricCards = [
    {
      label: 'MONTHLY TOTAL',
      value: monthlyTotal,
      sub: `${activeRules.length} active rule${activeRules.length === 1 ? '' : 's'}`,
      dot: '#2977c9',
    },
    {
      label: 'DUE THIS WEEK',
      value: dueWeekAmount,
      sub: `${dueThisWeek.length} payment${dueThisWeek.length === 1 ? '' : 's'}`,
      dot: '#f59e0b',
    },
    {
      label: 'ANNUAL ESTIMATE',
      value: annualEstimate,
      sub: 'Across all active rules',
      dot: '#17a974',
    },
  ];

  return (
    <div>
      <div className="page-header page-header-desktop">
        <div>
          <h1>Recurring Expenses</h1>
          <p>Automatically record subscriptions, rent, and more.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3, minmax(0, 1fr))', marginBottom:'1rem' }}>
        {metricCards.map((m) => (
          <div key={m.label} style={{ ...panelStyle, minHeight:'88px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
              <p style={{ fontSize:'0.72rem', letterSpacing:'0.06em', color:'var(--text-sub)', fontWeight:800 }}>{m.label}</p>
              <span style={{ width:'9px', height:'9px', borderRadius:'999px', background:m.dot }} />
            </div>
            <p style={{ fontSize:'2rem', lineHeight:1, fontWeight:700, marginBottom:'0.3rem' }}>
              {currencySymbol}{Math.round(m.value).toLocaleString()}
            </p>
            <p style={{ fontSize:'0.78rem', color:'var(--text-sub)' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="responsive-grid-equal" style={{ alignItems:'start' }}>
        <section style={panelStyle}>
          <h3 style={{ fontSize:'1.02rem', fontWeight:700, marginBottom:'0.95rem' }}>Create recurring rule</h3>
          <form onSubmit={addRule}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem', marginBottom:'0.72rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.74rem', marginBottom:'0.28rem', color:'var(--text-sub)', fontWeight:700 }}>Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Netflix, Rent"
                  required
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.74rem', marginBottom:'0.28rem', color:'var(--text-sub)', fontWeight:700 }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  style={fieldStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem', marginBottom:'0.72rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.74rem', marginBottom:'0.28rem', color:'var(--text-sub)', fontWeight:700 }}>Amount ({currencySymbol}) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 499"
                  required
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.74rem', marginBottom:'0.28rem', color:'var(--text-sub)', fontWeight:700 }}>Next run date *</label>
                <input
                  type="date"
                  value={form.nextRunAt}
                  onChange={(e) => setForm((f) => ({ ...f, nextRunAt: e.target.value }))}
                  required
                  style={fieldStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom:'0.72rem' }}>
              <label style={{ display:'block', fontSize:'0.74rem', marginBottom:'0.28rem', color:'var(--text-sub)', fontWeight:700 }}>Cadence</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.45rem' }}>
                {CADENCE_OPTIONS.map((c) => {
                  const active = form.cadence === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, cadence: c }))}
                      style={{
                        border:'1px solid var(--glass-border)',
                        borderRadius:'999px',
                        padding:'0.34rem 0.72rem',
                        background: active ? '#2168ad' : 'var(--chip-bg)',
                        color: active ? 'white' : 'var(--text-main)',
                        fontWeight: active ? 700 : 600,
                        fontSize:'0.86rem',
                      }}
                    >
                      {c[0].toUpperCase() + c.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom:'0.82rem' }}>
              <label style={{ display:'block', fontSize:'0.74rem', marginBottom:'0.28rem', color:'var(--text-sub)', fontWeight:700 }}>Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Any details about this expense..."
                style={{ ...fieldStyle, resize:'vertical', fontFamily:'inherit' }}
              />
            </div>

            <button
              type="submit"
              style={{ width:'100%', padding:'0.64rem 0.8rem', borderRadius:'10px', border:'1px solid var(--glass-border)', background:'var(--surface-3)', color:'var(--text-main)', fontWeight:800, fontSize:'1.02rem' }}
            >
              Add rule
            </button>
          </form>
        </section>

        <section style={panelStyle}>
          <div style={{ display:'flex', gap:'0', border:'1px solid var(--glass-border)', borderRadius:'10px', overflow:'hidden', marginBottom:'0.9rem' }}>
            {[
              { key:'active', label:'Active rules' },
              { key:'upcoming', label:'Upcoming' },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding:'0.55rem 0.7rem',
                    border:'none',
                    background: active ? 'var(--surface-2)' : 'var(--surface-soft)',
                    color:'var(--text-main)',
                    fontWeight: active ? 800 : 700,
                    fontSize:'0.9rem',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem' }}>
              {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height:'92px', borderRadius:'10px' }} />)}
            </div>
          ) : shownRules.length === 0 ? (
            <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2.6rem 0 2rem', fontSize:'0.96rem' }}>
              No {activeTab === 'active' ? 'active rules' : 'upcoming payments'} yet.
            </p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem' }}>
              {shownRules.map((r) => (
                <div key={r.id} style={{ border:'1px solid var(--glass-border)', borderRadius:'11px', background:'var(--chip-bg)', padding:'0.7rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'36px 1fr auto auto auto', gap:'0.55rem', alignItems:'center' }}>
                    <div style={{ width:'34px', height:'34px', borderRadius:'8px', background:'rgba(139,92,246,0.12)', display:'grid', placeItems:'center', fontSize:'1rem' }}>
                      {categoryEmoji[r.category] || '🧾'}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:'0.92rem', fontWeight:800, lineHeight:1.2 }}>{r.title}</p>
                      <p style={{ fontSize:'0.74rem', color:'var(--text-sub)' }}>{r.category}</p>
                    </div>
                    <div style={{ textAlign:'right', minWidth:'64px' }}>
                      <p style={{ fontWeight:800, fontSize:'0.98rem' }}>{currencySymbol}{Number(r.amount || 0).toLocaleString()}</p>
                      <span style={{ fontSize:'0.7rem', color:'var(--text-sub)', background:'rgba(100,116,139,0.15)', padding:'0.12rem 0.45rem', borderRadius:'999px', display:'inline-block' }}>
                        {String(r.cadence || 'monthly').replace(/^./, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      aria-label="Toggle active"
                      style={{ width:'52px', height:'28px', borderRadius:'999px', border:'1px solid var(--glass-border)', background: r.active ? 'rgba(16,185,129,0.24)' : 'rgba(100,116,139,0.18)', position:'relative' }}
                    >
                      <span style={{ position:'absolute', top:'3px', left: r.active ? '27px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background: r.active ? '#10b981' : '#94a3b8', transition:'left 0.2s' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => del(r.id)}
                      aria-label="Delete rule"
                      style={{ width:'34px', height:'34px', borderRadius:'9px', border:'1px solid var(--glass-border)', background:'var(--chip-bg-strong)', color:'var(--text-muted)', display:'grid', placeItems:'center' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div style={{ marginTop:'0.4rem', display:'inline-block', fontSize:'0.72rem', color:'var(--text-sub)', background:'rgba(100,116,139,0.14)', borderRadius:'999px', padding:'0.15rem 0.5rem' }}>
                    {String(r.nextRunAt).slice(0, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}