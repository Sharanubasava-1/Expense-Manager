import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Grid2X2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '../context/PageTitleContext';
import API from '../api/api';
import { suggestCategory } from '../smart/categorize';
import { setCategoryOverride } from '../data/categoryOverridesRepo';
import { listExpenses } from '../data/expensesRepo';

const CATEGORIES = [
  { key: 'Food', icon: '🍽️' },
  { key: 'Transport', icon: '🚕' },
  { key: 'Entertainment', icon: '🎬' },
  { key: 'Health', icon: '🖤' },
  { key: 'Utilities', icon: '⚡' },
  { key: 'Housing', icon: '🏠' },
  { key: 'Shopping', icon: '🛍️' },
  { key: 'Other', icon: '📌' },
];

const METHOD_OPTIONS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Wallet'];
const TYPE_OPTIONS = [
  { key: 'Expense', icon: '💸' },
  { key: 'Income', icon: '💰' },
  { key: 'Transfer', icon: '🔁' },
];

const AddExpense = () => {
  const location = useLocation();
  const isEdit = Boolean(location.state?.mode === 'edit' && location.state?.expense);
  usePageTitle(isEdit ? 'Edit Expense' : 'Add Expense');
  const navigate = useNavigate();
  const scanned = location.state?.scanResult;
  const expenseToEdit = location.state?.expense;
  const merchant = scanned?.merchant || expenseToEdit?.merchant || '';
  const { currencySymbol } = useSettings();

  const [form, setForm] = useState({
    title: scanned?.merchant || expenseToEdit?.title || '',
    amount: scanned?.total || (expenseToEdit ? String(expenseToEdit.amount) : ''),
    date: scanned?.date || expenseToEdit?.date || new Date().toISOString().split('T')[0],
    category: expenseToEdit?.category || 'Food',
    paymentMethod: 'Cash',
    type: 'Expense',
    notes: expenseToEdit?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const suggestInput = useMemo(
    () => ({ title: form.title, merchant, notes: form.notes }),
    [form.title, form.notes, merchant]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await suggestCategory(suggestInput);
      if (!cancelled) setSuggestion(s);
      if (!cancelled && !form.category && s?.confidence >= 0.7) {
        setForm((f) => ({ ...f, category: s.category }));
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestInput.title, suggestInput.notes, suggestInput.merchant]);

  useEffect(() => {
    listExpenses()
      .then((arr) => {
        const recent = [...arr]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 3);
        setRecentExpenses(recent);
      })
      .catch(() => setRecentExpenses([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (suggestion?.category && form.category && suggestion.category !== form.category) {
        await setCategoryOverride(merchant || form.title, form.category);
      }

      if (isEdit && expenseToEdit) {
        await API.put(`/expenses/${expenseToEdit._id || expenseToEdit.id}`, {
          title: form.title,
          amount: Number(form.amount),
          date: form.date,
          category: form.category,
          notes: form.notes,
          merchant: merchant || undefined,
        });
      } else {
        await API.post('/expenses/add', {
          title: form.title,
          amount: Number(form.amount),
          date: form.date,
          category: form.category,
          notes: form.notes,
          merchant: merchant || undefined,
          source: scanned ? 'receipt' : 'manual',
        });
      }
      setSuccess(true);
      setTimeout(() => navigate('/expenses'), 1200);
    } catch (err) {
      setError(err.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  const liveAmount = Number(form.amount || 0);

  const clearForm = () => {
    setForm((f) => ({
      ...f,
      title: '',
      amount: '',
      notes: '',
      category: 'Food',
      paymentMethod: 'Cash',
      type: 'Expense',
      date: new Date().toISOString().split('T')[0],
    }));
  };

  const stepStyle = (active) => ({
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: `1px solid ${active ? '#16a34a' : 'rgba(100,116,139,0.5)'}`,
    color: active ? '#059669' : 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 700,
  });

  const panel = {
    border: '1px solid var(--glass-border)',
    borderRadius: '14px',
    background: 'var(--surface-1)',
    padding: '1.05rem',
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: '0.875rem', textAlign: 'center' }}>
        <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
          <CheckCircle2 size={36} />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem' }}>Expense Saved!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Redirecting to expenses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header page-header-desktop">
        <div>
          <h1>Add Expense</h1>
          <p>Record a new transaction.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Grid2X2 size={14} />} onClick={() => navigate('/expenses')}>
          View all expenses
        </Button>
      </div>

      {scanned && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--success)' }}>
          <CheckCircle2 size={16} />
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Pre-filled from receipt scan. <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Review and save.</span>
          </p>
        </div>
      )}

      <div className="responsive-grid-equal" style={{ alignItems: 'start' }}>
        <section style={panel}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ marginBottom: '0.875rem', padding: '0.7rem 0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { n: 1, t: 'Type' },
                { n: 2, t: 'Details' },
                { n: 3, t: 'Category' },
                { n: 4, t: 'Review' },
              ].map((s, i) => (
                <React.Fragment key={s.n}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={stepStyle(i < 2)}>{s.n}</span>
                    <span style={{ fontSize: '0.83rem', color: i < 2 ? '#059669' : 'var(--text-muted)', fontWeight: i < 2 ? 700 : 500 }}>{s.t}</span>
                  </div>
                  {i < 3 && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </React.Fragment>
              ))}
            </div>

            <p style={{ fontSize: '0.94rem', marginBottom: '0.48rem' }}>Transaction type</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.52rem', marginBottom: '0.9rem' }}>
              {TYPE_OPTIONS.map((t) => {
                const active = form.type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                    style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', background: active ? 'rgba(59,130,246,0.14)' : 'var(--chip-bg)', padding: '0.55rem 0.45rem', color: active ? '#2563eb' : 'var(--text-main)' }}
                  >
                    <div style={{ fontSize: '1.05rem', marginBottom: '0.15rem' }}>{t.icon}</div>
                    <p style={{ fontSize: '0.84rem' }}>{t.key}</p>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.72rem', marginBottom: '0.72rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.32rem' }}>Description / Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Client Lunch" required style={{ width: '100%', padding: '0.62rem 0.72rem', borderRadius: '9px', border: '1px solid var(--glass-border)', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1.02rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.32rem' }}>Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type="date" value={form.date} onChange={set('date')} required style={{ width: '100%', padding: '0.62rem 2.1rem 0.62rem 0.72rem', borderRadius: '9px', border: '1px solid var(--glass-border)', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1.02rem', outline: 'none' }} />
                  <Calendar size={15} style={{ position: 'absolute', right: '0.62rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.72rem', marginBottom: '0.72rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.32rem' }}>Amount ({currencySymbol}) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr', border: '1px solid var(--glass-border)', borderRadius: '9px', overflow: 'hidden', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'grid', placeItems: 'center', borderRight: '1px solid var(--glass-border)', color: 'var(--text-sub)' }}>{currencySymbol}</div>
                  <input type="number" value={form.amount} onChange={set('amount')} placeholder="0.00" required style={{ padding: '0.62rem 0.72rem', border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '1.02rem', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.32rem' }}>Payment method</label>
                <select value={form.paymentMethod} onChange={set('paymentMethod')} style={{ width: '100%', padding: '0.62rem 0.72rem', borderRadius: '9px', border: '1px solid var(--glass-border)', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1.02rem', outline: 'none' }}>
                  {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {suggestion?.category && !isEdit && (
              <div style={{ marginBottom: '0.7rem', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                Suggestion: <strong style={{ color: 'var(--text-main)' }}>{suggestion.category}</strong> ({Math.round((suggestion.confidence || 0) * 100)}%)
              </div>
            )}

            <p style={{ fontSize: '0.94rem', marginBottom: '0.48rem' }}>Category <span style={{ color: 'var(--danger)' }}>*</span></p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.48rem', marginBottom: '0.82rem' }}>
              {CATEGORIES.map((c) => {
                const active = form.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                    style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', background: active ? 'rgba(34,197,94,0.14)' : 'var(--chip-bg)', color: 'var(--text-main)', padding: '0.5rem 0.35rem' }}
                  >
                    <div style={{ fontSize: '0.95rem' }}>{c.icon}</div>
                    <div style={{ fontSize: '0.74rem' }}>{c.key}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.32rem' }}>Notes (optional)</label>
              <textarea value={form.notes} onChange={set('notes')} placeholder="Add any extra details..." rows={3} style={{ width: '100%', padding: '0.62rem 0.72rem', borderRadius: '9px', border: '1px solid var(--glass-border)', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1.02rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: '0.5rem' }}>
              <button type="button" onClick={clearForm} style={{ border: '1px solid var(--glass-border)', background: 'var(--chip-bg)', borderRadius: '10px', padding: '0.62rem 0.6rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                Clear
              </button>
              <button type="submit" disabled={loading} style={{ border: '1px solid var(--glass-border)', background: 'var(--surface-3)', borderRadius: '10px', padding: '0.62rem 0.6rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {loading ? 'Saving...' : isEdit ? 'Update expense' : 'Save expense'}
              </button>
            </div>
          </form>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.72rem' }}>
          <section style={panel}>
            <h3 style={{ fontSize: '1.68rem', marginBottom: '0.68rem', fontWeight: 500, lineHeight: 1.1 }}>Live preview</h3>
            <div style={{ background: 'var(--chip-bg)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.68rem 0.74rem' }}>
              {[
                ['Title', form.title || '-'],
                ['Amount', liveAmount ? `${currencySymbol}${liveAmount.toLocaleString('en-IN')}` : '-'],
                ['Category', form.category || '-'],
                ['Date', form.date ? new Date(form.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'],
                ['Method', form.paymentMethod || '-'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.3rem 0', borderBottom: k === 'Method' ? 'none' : '1px solid var(--divider-soft)' }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: '1rem' }}>{k}</span>
                  <span style={{ color: k === 'Amount' ? '#b91c1c' : 'var(--text-main)', fontSize: '1rem' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={panel}>
            <h3 style={{ fontSize: '1.04rem', marginBottom: '0.6rem', fontWeight: 700, letterSpacing: '0.03em', color: 'var(--text-sub)' }}>RECENT EXPENSES</h3>
            {recentExpenses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent expenses</p>
            ) : (
              <div>
                {recentExpenses.map((e) => {
                  const id = e._id || e.id;
                  const c = CATEGORIES.find((x) => x.key === (e.category || 'Other'));
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setForm((f) => ({
                        ...f,
                        title: e.title || f.title,
                        amount: String(e.amount || f.amount || ''),
                        category: e.category || f.category,
                        date: String(e.date || f.date).slice(0, 10),
                      }))}
                      style={{ width: '100%', textAlign: 'left', display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '0.52rem', alignItems: 'center', border: 'none', borderBottom: '1px solid var(--divider-soft)', padding: '0.45rem 0.12rem', background: 'transparent' }}
                    >
                      <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(139,92,246,0.14)', display: 'grid', placeItems: 'center' }}>{c?.icon || '🧾'}</span>
                      <span>
                        <span style={{ display: 'block', fontSize: '1.02rem', color: 'var(--text-main)' }}>{e.title}</span>
                        <span style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-muted)' }}>{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      </span>
                      <span style={{ color: '#b91c1c', fontSize: '1.08rem' }}>-{currencySymbol}{Number(e.amount || 0).toLocaleString('en-IN')}</span>
                    </button>
                  );
                })}
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.56rem' }}>Click any item to prefill form</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;