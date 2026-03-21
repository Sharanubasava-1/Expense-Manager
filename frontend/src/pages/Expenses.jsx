import React from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../context/PageTitleContext';
import { useSettings } from '../context/SettingsContext';
import { exportExpensesExcel } from '../utils/exportExcel';
import API from '../api/api';

const CHIP_CATEGORIES = [
  { key: 'All', icon: '' },
  { key: 'Entertainment', icon: '🎬' },
  { key: 'Food', icon: '🍽️' },
  { key: 'Transport', icon: '🚕' },
  { key: 'Health', icon: '🖤' },
  { key: 'Utilities', icon: '⚡' },
  { key: 'Other', icon: '📌' },
];

const categoryPillColor = {
  Entertainment: 'rgba(99,102,241,0.18)',
  Food: 'rgba(34,197,94,0.16)',
  Transport: 'rgba(59,130,246,0.16)',
  Health: 'rgba(236,72,153,0.16)',
  Utilities: 'rgba(245,158,11,0.16)',
  Other: 'rgba(148,163,184,0.18)',
};

const prettyMoney = (symbol, n) => `${symbol}${Number(n || 0).toLocaleString('en-IN')}`;

const formatDate = (v) => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const Expenses = () => {
  usePageTitle('Expenses');

  const navigate = useNavigate();
  const { currencySymbol, currency } = useSettings();

  const [loading, setLoading] = React.useState(true);
  const [expenses, setExpenses] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('newest');
  const [status, setStatus] = React.useState('All statuses');
  const [category, setCategory] = React.useState('All');
  const [selectedIds, setSelectedIds] = React.useState([]);

  React.useEffect(() => {
    API.get('/expenses')
      .then((res) => {
        const list = Array.isArray(res?.expenses) ? res.expenses : (Array.isArray(res?.data) ? res.data : []);
        setExpenses(list);
      })
      .finally(() => setLoading(false));
  }, [currency]);

  const filtered = React.useMemo(() => {
    let rows = [...expenses];

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) => (`${e.title || ''} ${e.category || ''} ${e.amount || ''}`).toLowerCase().includes(q));
    }

    if (status !== 'All statuses') {
      rows = rows.filter((e) => String(e.status || 'Approved') === status);
    }

    if (category !== 'All') {
      rows = rows.filter((e) => String(e.category || 'Other') === category);
    }

    if (sort === 'newest') rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sort === 'oldest') rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sort === 'amount_high') rows.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    if (sort === 'amount_low') rows.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));

    return rows;
  }, [expenses, search, sort, status, category]);

  const totalSpent = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  const transactions = filtered.length;
  const avg = transactions > 0 ? totalSpent / transactions : 0;
  const largest = filtered.reduce((max, e) => Number(e.amount || 0) > Number(max.amount || 0) ? e : max, filtered[0] || { amount: 0, title: '-' });

  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.includes(e._id || e.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filtered.map((e) => e._id || e.id));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectedRows = React.useMemo(
    () => expenses.filter((e) => selectedIds.includes(e._id || e.id)),
    [expenses, selectedIds]
  );

  const handleEditSelected = () => {
    if (selectedRows.length !== 1) return;
    navigate('/add-expense', { state: { mode: 'edit', expense: selectedRows[0] } });
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows.length) return;

    const msg = selectedRows.length === 1
      ? 'Delete selected expense?'
      : `Delete ${selectedRows.length} selected expenses?`;

    if (!window.confirm(msg)) return;

    await Promise.all(
      selectedRows.map((row) => API.delete(`/expenses/${row._id || row.id}`))
    );

    const removeSet = new Set(selectedRows.map((row) => row._id || row.id));
    setExpenses((prev) => prev.filter((e) => !removeSet.has(e._id || e.id)));
    setSelectedIds([]);
  };

  const exportCSV = () => {
    const rows = filtered.map((e) => [
      `"${e.title || ''}"`,
      `"${e.category || 'Other'}"`,
      `"${formatDate(e.date)}"`,
      Number(e.amount || 0),
      `"${e.status || 'Approved'}"`,
    ].join(','));

    const blob = new Blob([
      ['Description,Category,Date,Amount,Status', ...rows].join('\n'),
    ], { type: 'text/csv' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="page-header page-header-desktop" style={{ marginBottom: '0.8rem' }}>
        <div>
          <h1>Expenses</h1>
          <p>Manage and track all your transactions.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={exportCSV}
            style={{ border: '1px solid var(--glass-border)', background: 'var(--surface-1)', borderRadius: '10px', padding: '0.55rem 0.85rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportExpensesExcel(filtered, 'expenses.xlsx')}
            style={{ border: '1px solid var(--glass-border)', background: 'var(--surface-1)', borderRadius: '10px', padding: '0.55rem 0.85rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={14} /> Export Excel
          </button>
          <button
            type="button"
            onClick={() => navigate('/add-expense')}
            style={{ border: '1px solid var(--glass-border)', background: 'var(--surface-3)', borderRadius: '10px', padding: '0.55rem 0.85rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Plus size={14} /> New expense
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: '0.75rem' }}>
        <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'var(--surface-1)', padding: '0.8rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-sub)' }}>TOTAL SPENT</p>
          <p style={{ fontSize: '2rem', lineHeight: 1.05 }}>{prettyMoney(currencySymbol, totalSpent)}</p>
          <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.74rem', borderRadius: '999px', padding: '0.16rem 0.45rem', color: '#b91c1c', background: 'rgba(239,68,68,0.12)' }}>▲ 5.2% vs last month</span>
        </div>

        <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'var(--surface-1)', padding: '0.8rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-sub)' }}>TRANSACTIONS</p>
          <p style={{ fontSize: '2rem', lineHeight: 1.05 }}>{transactions}</p>
          <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.74rem', borderRadius: '999px', padding: '0.16rem 0.45rem', color: 'var(--text-sub)', background: 'rgba(148,163,184,0.16)' }}>This month</span>
        </div>

        <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'var(--surface-1)', padding: '0.8rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-sub)' }}>AVG PER TRANSACTION</p>
          <p style={{ fontSize: '2rem', lineHeight: 1.05 }}>{prettyMoney(currencySymbol, avg)}</p>
          <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.74rem', borderRadius: '999px', padding: '0.16rem 0.45rem', color: 'var(--text-sub)', background: 'rgba(148,163,184,0.16)' }}>{prettyMoney(currencySymbol, totalSpent)} ÷ {transactions || 1}</span>
        </div>

        <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'var(--surface-1)', padding: '0.8rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-sub)' }}>LARGEST EXPENSE</p>
          <p style={{ fontSize: '2rem', lineHeight: 1.05 }}>{prettyMoney(currencySymbol, largest.amount)}</p>
          <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.86rem', color: 'var(--text-sub)' }}>{largest.title || '-'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.62rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, amount..."
            style={{ width: '100%', padding: '0.58rem 0.72rem 0.58rem 2rem', border: '1px solid var(--glass-border)', borderRadius: '10px', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: '100%', padding: '0.58rem 0.72rem', border: '1px solid var(--glass-border)', borderRadius: '10px', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_high">Amount high to low</option>
          <option value="amount_low">Amount low to high</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '0.58rem 0.72rem', border: '1px solid var(--glass-border)', borderRadius: '10px', background: 'var(--surface-2)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}>
          <option>All statuses</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
          <option>Draft</option>
          <option>Refunded</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.6rem' }}>
        {CHIP_CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              style={{
                border: `1px solid ${active ? '#1561ad' : 'var(--glass-border)'}`,
                borderRadius: '999px',
                padding: '0.34rem 0.8rem',
                background: active ? '#1561ad' : 'var(--chip-bg)',
                color: active ? 'white' : 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.95rem',
              }}
            >
              {c.icon && <span>{c.icon}</span>}
              <span>{c.key}</span>
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div
          style={{
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            background: 'var(--surface-2)',
            padding: '0.5rem 0.65rem',
            marginBottom: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>
            {selectedIds.length} selected
          </span>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={handleEditSelected}
              disabled={selectedIds.length !== 1}
              style={{
                border: '1px solid var(--glass-border)',
                background: selectedIds.length === 1 ? 'var(--surface-3)' : 'var(--surface-1)',
                color: 'var(--text-main)',
                borderRadius: '9px',
                padding: '0.42rem 0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: selectedIds.length === 1 ? 'pointer' : 'not-allowed',
                opacity: selectedIds.length === 1 ? 1 : 0.65,
              }}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              style={{
                border: '1px solid rgba(239,68,68,0.35)',
                background: 'rgba(239,68,68,0.12)',
                color: 'var(--danger)',
                borderRadius: '9px',
                padding: '0.42rem 0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'var(--surface-1)', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '42px' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th>DESCRIPTION</th>
              <th>CATEGORY</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</td>
              </tr>
            ) : (
              filtered.map((e) => {
                const id = e._id || e.id;
                const cat = String(e.category || 'Other');
                const catBg = categoryPillColor[cat] || categoryPillColor.Other;
                const statusValue = String(e.status || 'Approved');
                return (
                  <tr key={id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleOne(id)} />
                    </td>
                    <td>
                      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: '0.6rem', alignItems: 'center' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.13)', display: 'grid', placeItems: 'center' }}>
                          {CATEGORY_EMOJI[cat] || '📌'}
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', lineHeight: 1.15 }}>{e.title}</div>
                          <div style={{ color: 'var(--text-sub)', fontSize: '0.86rem' }}>{e.notes || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', borderRadius: '999px', padding: '0.18rem 0.55rem', background: catBg, color: 'var(--text-main)' }}>
                        {CATEGORY_EMOJI[cat] ? `${CATEGORY_EMOJI[cat]} ` : ''}{cat}
                      </span>
                    </td>
                    <td>{formatDate(e.date)}</td>
                    <td>
                      <span style={{ display: 'inline-block', borderRadius: '999px', padding: '0.18rem 0.55rem', background: 'rgba(34,197,94,0.14)', color: '#3f7f2a' }}>
                        {statusValue}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 700 }}>
                      - {prettyMoney(currencySymbol, e.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', padding: '0.72rem 0.95rem' }}>
          <span style={{ color: 'var(--text-sub)' }}>Showing {filtered.length} of {expenses.length} transactions</span>
          <span style={{ fontSize: '1.06rem' }}>Total: -{prettyMoney(currencySymbol, totalSpent)}</span>
        </div>
      </div>
    </div>
  );
};

const CATEGORY_EMOJI = {
  Entertainment: '🎬',
  Food: '🍽️',
  Transport: '🚕',
  Health: '🖤',
  Utilities: '⚡',
  Other: '📌',
};

export default Expenses;
