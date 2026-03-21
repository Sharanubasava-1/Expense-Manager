import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, PlusCircle, Target, CalendarClock, LogOut, Wallet2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API from '../api/api';

const sections = [
  {
    title: 'OVERVIEW',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    title: 'TRANSACTIONS',
    items: [
      { icon: <Receipt size={18} />, label: 'Expenses', path: '/expenses', badgeKey: 'expenses' },
      { icon: <PlusCircle size={18} />, label: 'Add expense', path: '/add-expense' },
      { icon: <Receipt size={18} />, label: 'Receipt scanner', path: '/scan-receipt' },
    ],
  },
  {
    title: 'PLANNING',
    items: [
      { icon: <Target size={18} />, label: 'Budgets', path: '/budgets', badgeKey: 'budgets' },
      { icon: <CalendarClock size={18} />, label: 'Recurring', path: '/recurring', badgeKey: 'recurring' },
    ],
  },
];

const Sidebar = () => {
  const { signOutUser, user } = useAuth();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [badges, setBadges] = React.useState({ expenses: 0, budgets: 0, recurring: 0 });
  const [monthSpend, setMonthSpend] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [expRes, bRes, rRes] = await Promise.all([
          API.get('/expenses'),
          API.get('/budgets'),
          API.get('/recurring'),
        ]);

        const expenses = Array.isArray(expRes?.expenses) ? expRes.expenses : (Array.isArray(expRes?.data) ? expRes.data : []);
        const budgets = Array.isArray(bRes?.budgets) ? bRes.budgets : [];
        const recurring = Array.isArray(rRes?.rules) ? rRes.rules : [];

        const ym = new Date().toISOString().slice(0, 7);
        const spent = expenses
          .filter((e) => String(e.date || '').slice(0, 7) === ym)
          .reduce((s, e) => s + Number(e.amount || 0), 0);

        if (active) {
          setBadges({
            expenses: expenses.length,
            budgets: budgets.length,
            recurring: recurring.filter((r) => r.active !== false).length,
          });
          setMonthSpend(spent);
        }
      } catch {
        if (active) {
          setBadges({ expenses: 0, budgets: 0, recurring: 0 });
          setMonthSpend(0);
        }
      }
    };
    load().catch(() => {});
    return () => { active = false; };
  }, [currency]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <aside className="sidebar-nav glass">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <Wallet2 size={19} color="white" />
        </div>
        <div>
          <h2 className="sidebar-brand-title">Expense</h2>
          <p className="sidebar-brand-subtitle">Manager</p>
        </div>
      </div>

      <div className="sidebar-month-chip">
        <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <strong>₹{Math.round(monthSpend).toLocaleString('en-IN')} spent</strong>
      </div>

      <nav className="sidebar-links">
        {sections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <p className="sidebar-section-title">{section.title}</p>
            <div className="sidebar-section-items">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="sidebar-nav-icon-box">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badgeKey && (
                    <span className={`sidebar-pill-badge ${item.badgeKey === 'budgets' ? 'warn' : ''}`}>
                      {item.badgeKey === 'budgets' ? (badges[item.badgeKey] ? `${badges[item.badgeKey]} alert` : '0') : badges[item.badgeKey]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-budget-box">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
          <span>Monthly budget</span>
          <strong>2%</strong>
        </div>
        <div className="sidebar-progress-track">
          <div className="sidebar-progress-fill" style={{ width:'2%' }} />
        </div>
        <p style={{ fontSize:'0.74rem', color:'var(--text-muted)', marginTop:'0.22rem' }}>₹240 of ₹12,000 used · 10 days left</p>
      </div>

      <div className="sidebar-logout" style={{ marginTop:'0.45rem' }}>
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;