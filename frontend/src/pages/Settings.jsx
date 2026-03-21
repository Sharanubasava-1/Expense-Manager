import { Moon, Sun, DollarSign, Database, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { clearAllUserData, deleteCurrentAccount } from '../data/clearAllData';
import { setToken } from '../api/api';

export default function Settings() {
  const { settings, updateSettings, toggleTheme } = useAppContext();

  const currencySelectStyle = {
    width: '240px',
    padding: '0.62rem 0.74rem',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'var(--surface-2)',
    color: 'var(--text-main)',
    fontWeight: 600,
    fontSize: '1rem',
    outline: 'none',
    colorScheme: settings.theme === 'dark' ? 'dark' : 'light',
  };

  const currencyOptionStyle = {
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-secondary)',
  };

  const currencies = [
    { label: 'US Dollar ($)', value: '$' },
    { label: 'Euro (€)', value: '€' },
    { label: 'British Pound (£)', value: '£' },
    { label: 'Indian Rupee (₹)', value: '₹' },
    { label: 'Japanese Yen (¥)', value: '¥' }
  ];

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        await clearAllUserData();
        window.location.reload();
      } catch (err) {
        alert(err?.message || 'Failed to clear data. Please try again.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? This will remove all your data and cannot be undone.')) return;
    if (!window.confirm('Final warning: Delete account now?')) return;

    try {
      await deleteCurrentAccount();
      setToken(null);
      window.location.href = '/login';
    } catch (err) {
      alert(err?.message || 'Failed to delete account. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 max-w-2xl">
      <header style={{ marginBottom: '1rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '2rem' }}>App Settings</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Customize your experience and manage your data.</p>
      </header>

      <div className="glass-panel flex flex-col gap-6">
        <h3 className="flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
          <Sun size={20} className="text-secondary" /> Appearance
        </h3>
        
        <div className="flex justify-between items-center" style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: '12px' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Dark Mode</h4>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Toggle between dark and light themes.</p>
          </div>
          <button 
            className={`btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={toggleTheme}
            style={{ width: '50px', height: '50px', padding: 0, borderRadius: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {settings.theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
        </div>

        <h3 className="flex items-center gap-2" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
          <DollarSign size={20} className="text-secondary" /> Currency preferences
        </h3>

        <div className="flex justify-between items-center" style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: '12px' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Primary Currency</h4>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Used across all your transactions and dashboard.</p>
          </div>
          <select 
            value={settings.currency} 
            onChange={(e) => updateSettings({ currency: e.target.value })}
            style={currencySelectStyle}
          >
            {currencies.map(c => (
              <option key={c.value} value={c.value} style={currencyOptionStyle}>{c.value} - {c.label}</option>
            ))}
          </select>
        </div>

        <h3 className="flex items-center gap-2 text-danger" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
          <Database size={20} /> Data Management
        </h3>

        <div className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div>
            <h4 className="text-danger" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Clear Local Storage</h4>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Delete all transactions permanently.</p>
          </div>
          <button className="btn btn-danger" onClick={handleClearData}>
            <Trash2 size={20} /> Clear Data
          </button>
        </div>

        <div className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
          <div>
            <h4 className="text-danger" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Delete Account</h4>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Permanently delete your account and all associated records.</p>
          </div>
          <button className="btn btn-danger" onClick={handleDeleteAccount}>
            <Trash2 size={20} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}