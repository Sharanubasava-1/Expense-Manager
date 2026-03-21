import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import {
  Settings, HelpCircle, Info, ChevronDown,
  Sun, Moon, X, Check, ChevronRight,
  Database, Trash2, Download, Upload
} from 'lucide-react';
import API from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../auth/AuthContext';
import { PageTitleContext } from '../context/PageTitleContext';
import { exportEncryptedBackup, exportPlainBackup, importEncryptedBackup, importPlainBackup } from '../security/backup';
import { clearAllUserData, clearLocalCaches, deleteCurrentAccount } from '../data/clearAllData';

const routeTitles = {
  '/dashboard':    'Dashboard',
  '/expenses':     'Expenses',
  '/add-expense':  'Add Expense',
  '/scan-receipt': 'Receipt Scanner',
  '/budgets':      'Budgets',
  '/recurring':    'Recurring',
};

// ── Shared modal wrapper ──────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else       document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const node = (
    <div
      onClick={onClose}
      onTouchStart={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(2,6,23,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', maxHeight: '90vh',
          background: 'var(--bg-secondary)',
          color: 'var(--text-main)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(2,6,23,0.45)',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeUp 0.22s ease-out both',
          overflow: 'hidden'
        }}
      >
        {/* Modal header */}
        <div style={{ flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.1rem 1.4rem', borderBottom:'1px solid var(--glass-border)', background:'rgba(59,130,246,0.06)' }}>
          <h2 style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-main)' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid var(--glass-border)', borderRadius:'50%', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.14)'}
            onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
            <X size={15}/>
          </button>
        </div>
        {/* Modal body */}
        <div style={{ padding:'1.4rem', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
};

// ── Section title ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p style={{ fontSize:'0.68rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:'0.625rem' }}>
    {children}
  </p>
);

// ── Settings modal ────────────────────────────────────────────────────────────
const SettingsModal = ({ open, onClose }) => {
  const { theme, setTheme, currency, setCurrency, CURRENCIES, isConvertingCurrency } = useSettings();
  const { signOutUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const encFileInputRef = useRef(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const exportData = () => {
    try {
      exportPlainBackup().then((payload) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Backup exported successfully.');
      }).catch((e) => alert('Failed to export data: ' + e.message));
    } catch (e) {
      alert('Failed to export data: ' + e.message);
    }
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid backup file.');
        if (window.confirm('This will import data into your app. Continue?')) {
          importPlainBackup(data).then(() => {
            alert('Data imported successfully. App will reload.');
            window.location.reload();
          }).catch((err) => alert('Import failed: ' + err.message));
        }
      } catch (err) {
        alert('Could not read the backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportEncrypted = async () => {
    const pwd = window.prompt('Set a password for this encrypted backup.');
    if (!pwd) return;
    try {
      const envelope = await exportEncryptedBackup(pwd);
      const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense_manager_backup_${new Date().toISOString().split('T')[0]}.encrypted.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Encrypted backup exported successfully.');
    } catch (e) {
      alert('Failed to export encrypted backup: ' + e.message);
    }
  };

  const importEncrypted = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const envelope = JSON.parse(event.target.result);
        const pwd = window.prompt('Enter the password for this backup.');
        if (!pwd) return;
        if (window.confirm('This will import decrypted data into your app. Continue?')) {
          await importEncryptedBackup(envelope, pwd);
          alert('Encrypted data imported successfully. App will reload.');
          window.location.reload();
        }
      } catch (err) {
        alert('Could not import encrypted backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteAllData = async () => {
    if (window.confirm('WARNING: This will permanently delete ALL your recorded expenses. This action cannot be undone.\n\nAre you sure you want to proceed?')) {
      if (window.confirm('Final warning: Delete all data?')) {
        try {
          await clearAllUserData();
          alert('All data has been deleted. App will reload.');
          window.location.reload();
        } catch (err) {
          alert(err?.message || 'Failed to delete all data. Please try again.');
        }
      }
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('WARNING: This will permanently delete your account and ALL your data. This action cannot be undone.\n\nDo you want to continue?')) {
      return;
    }
    if (!window.confirm('Final warning: Delete your account permanently?')) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteCurrentAccount();
      await clearLocalCaches();
      await signOutUser();
      onClose();
      navigate('/login', { replace: true });
    } catch (err) {
      alert(err?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      {/* Theme */}
      <SectionLabel>Appearance</SectionLabel>
      <div style={{ display:'flex', gap:'0.625rem', marginBottom:'1.5rem' }}>
        {[
          { value:'dark',  label:'Dark',  icon:<Moon size={18}/> },
          { value:'light', label:'Light', icon:<Sun  size={18}/> },
        ].map(opt => {
          const active = theme === opt.value;
          return (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center',
                gap:'0.5rem', padding:'1rem 0.75rem',
                borderRadius:'var(--radius-md)', cursor:'pointer',
                border: `2px solid ${active ? 'var(--primary)' : 'var(--glass-border)'}`,
                background: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                transition:'all 0.2s', fontWeight:600, fontSize:'0.85rem',
              }}
            >
              {opt.icon}
              {opt.label}
              {active && <Check size={12} style={{ position:'absolute' }} />}
            </button>
          );
        })}
      </div>

      {/* Currency */}
      <SectionLabel>Currency</SectionLabel>
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ position:'relative' }}>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={isConvertingCurrency}
            style={{
              width:'100%', padding:'0.75rem 1rem', borderRadius:'var(--radius-md)',
              border:'1px solid var(--glass-border)', background:'var(--surface-2)',
              color:'var(--text-main)', fontSize:'0.9rem', fontWeight:600,
              appearance:'none', cursor:'pointer',
              colorScheme: theme === 'dark' ? 'dark' : 'light'
            }}
          >
            {CURRENCIES.map(c => (
              <option
                key={c.code}
                value={c.code}
                style={{
                  color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
                  backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff'
                }}
              >
                {c.symbol} - {c.name} ({c.code})
              </option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position:'absolute', right:'1rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'var(--text-muted)' }}/>
        </div>
        {isConvertingCurrency && (
          <p style={{ marginTop:'0.4rem', fontSize:'0.75rem', color:'var(--text-muted)' }}>
            Converting existing amounts to selected currency...
          </p>
        )}
      </div>

      {/* Data Management */}
      <SectionLabel>Data Management</SectionLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
        <input type="file" accept=".json" style={{ display:'none' }} ref={fileInputRef} onChange={importData} />
        <input type="file" accept=".json" style={{ display:'none' }} ref={encFileInputRef} onChange={importEncrypted} />
        
        <button onClick={exportData} style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.75rem', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', transition:'background 0.2s' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(59,130,246,0.15)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Download size={16}/>
          </div>
          <div style={{ textAlign:'left', flex:1 }}>
            <p>Export Backup</p>
            <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500 }}>Save all data to a JSON file</p>
          </div>
        </button>

        <button onClick={exportEncrypted} style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.75rem', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', transition:'background 0.2s' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(139,92,246,0.15)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Download size={16}/>
          </div>
          <div style={{ textAlign:'left', flex:1 }}>
            <p>Export Encrypted Backup</p>
            <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500 }}>Password-protected AES-GCM</p>
          </div>
        </button>

        <button onClick={() => fileInputRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.75rem', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', transition:'background 0.2s' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(16,185,129,0.15)', color:'var(--success)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Upload size={16}/>
          </div>
          <div style={{ textAlign:'left', flex:1 }}>
            <p>Import Backup</p>
            <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500 }}>Restore from a JSON file</p>
          </div>
        </button>

        <button onClick={() => encFileInputRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.75rem', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', transition:'background 0.2s' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(245,158,11,0.15)', color:'var(--warning)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Upload size={16}/>
          </div>
          <div style={{ textAlign:'left', flex:1 }}>
            <p>Import Encrypted Backup</p>
            <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500 }}>Decrypt with your password</p>
          </div>
        </button>

        <button onClick={deleteAllData} style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.75rem', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-md)', color:'var(--danger)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', transition:'background 0.2s', marginTop:'0.5rem' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(239,68,68,0.15)', color:'var(--danger)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Trash2 size={16}/>
          </div>
          <div style={{ textAlign:'left', flex:1 }}>
            <p>Delete All Data</p>
            <p style={{ fontSize:'0.7rem', opacity:0.8, fontWeight:500 }}>Permanently erase all records</p>
          </div>
        </button>

        <button
          onClick={deleteAccount}
          disabled={isDeletingAccount}
          style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.75rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.5)', borderRadius:'var(--radius-md)', color:'var(--danger)', fontSize:'0.85rem', fontWeight:700, cursor:isDeletingAccount ? 'not-allowed' : 'pointer', transition:'background 0.2s' }}
        >
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(239,68,68,0.22)', color:'var(--danger)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Trash2 size={16}/>
          </div>
          <div style={{ textAlign:'left', flex:1 }}>
            <p>{isDeletingAccount ? 'Deleting account...' : 'Delete Account'}</p>
            <p style={{ fontSize:'0.7rem', opacity:0.9, fontWeight:500 }}>Permanently delete your account and all records</p>
          </div>
        </button>
      </div>

    </Modal>
  );
};

// ── About modal ───────────────────────────────────────────────────────────────
const AboutModal = ({ open, onClose }) => {
  const features = [
    ['📊', 'Dashboard Overview',    'Live financial summary with category breakdown and spending trend charts.'],
    ['💳', 'Expense Tracking',      'Add, filter, search and export all your transactions as CSV.'],
    ['📷', 'Receipt Scanner',       'On-device OCR powered by Tesseract.js — extracts amounts from photos of receipts with no internet needed.'],
    ['📂', 'Multi-Image Scanning',  'Upload and scan multiple receipt photos in one go, each with its own result.'],
    ['🎨', 'Dark & Light Mode',     'Switch between themes in Settings to match your preference.'],
  ];

  return (
    <Modal open={open} onClose={onClose} title="About Expense Manager">
      {/* App identity */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem', padding:'1rem', borderRadius:'var(--radius-md)', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.15)' }}>
        <div style={{ width:'52px', height:'52px', borderRadius:'var(--radius-md)', background:'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', flexShrink:0, fontSize:'1.5rem' }}>
          💰
        </div>
        <div>
          <h3 style={{ fontWeight:800, fontSize:'1.05rem', marginBottom:'0.15rem', color:'var(--text-main)' }}>Expense Manager</h3>
          <p style={{ fontSize:'0.78rem', color:'var(--text-sub)' }}>Version 1.0 · Built for the web with React</p>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize:'0.875rem', color:'var(--text-sub)', lineHeight:1.7, marginBottom:'1.5rem' }}>
        A personal finance app designed to help you track expenses, scan receipts, and understand your spending — all without needing an account or internet connection. Your data lives on your device.
      </p>

      {/* Features */}
      <SectionLabel>Features</SectionLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
        {features.map(([emoji, title, desc]) => (
          <div key={title} style={{ display:'flex', gap:'0.875rem', alignItems:'flex-start', padding:'0.75rem', borderRadius:'var(--radius-md)', background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)' }}>
            <span style={{ fontSize:'1.2rem', flexShrink:0, marginTop:'0.1rem' }}>{emoji}</span>
            <div>
              <p style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:'0.15rem', color:'var(--text-main)' }}>{title}</p>
              <p style={{ fontSize:'0.78rem', color:'var(--text-sub)', lineHeight:1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      {/* <div style={{ marginTop:'1.25rem', marginBottom:'1.5rem', padding:'0.875rem 1rem', borderRadius:'var(--radius-md)', background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.15)' }}>
        <p style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.35rem' }}>Built With</p>
        <p style={{ fontSize:'0.8rem', color:'var(--text-sub)', lineHeight:1.6 }}>
          React · Vite · Tesseract.js · Lucide Icons
        </p>
      </div> */}
      
      <button onClick={onClose} style={{ width:'100%', padding:'0.875rem', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg,var(--primary),var(--accent))', color:'white', fontWeight:700, fontSize:'0.9rem', cursor:'pointer' }}>
        Got it
      </button>
    </Modal>
  );
};

// ── Support modal ───────────────────────────────────────────────────────────
const SupportModal = ({ open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose} title="Support & Instructions">
      <SectionLabel>How to get help</SectionLabel>
      <div style={{ marginBottom:'1rem', lineHeight:1.6, color:'var(--text-sub)' }}>
        <p>If something isn't working, please include:</p>
        <ul style={{ marginLeft:'1rem' }}>
          <li>App version and browser</li>
          <li>Steps to reproduce the issue</li>
          <li>Expected result vs actual result</li>
        </ul>
        <p style={{ marginTop:'0.6rem' }}>You can also attach a backup file to help diagnose problems. To create one, open <strong>Settings → Export Backup</strong>.</p>
        <p style={{ marginTop:'0.6rem' }}>For feature requests or bug reports, email <strong>expensemanager@myyahoo.com</strong>.</p>
      </div>
      <div style={{ display:'flex', gap:'0.5rem' }}>
        <button onClick={onClose} style={{ flex:1, padding:'0.8rem', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg,var(--primary),var(--accent))', color:'white', fontWeight:700, cursor:'pointer' }}>Close</button>
        <button onClick={() => { window.location.href = 'mailto:expensemanager@myyahoo.com'; }} style={{ padding:'0.8rem', borderRadius:'var(--radius-md)', border:'1px solid var(--glass-border)', background:'transparent', color:'var(--text-main)', fontWeight:700, cursor:'pointer' }}>Email Support</button>
      </div>
    </Modal>
  );
};

// ── Account menu ──────────────────────────────────────────────────────────────
const AccountMenu = () => {
  const { theme } = useSettings();
  const { user, signOutUser } = useAuth();
  const [open,          setOpen]          = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [aboutOpen,     setAboutOpen]     = useState(false);
  const [supportOpen,   setSupportOpen]   = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleAccountStatusClick = async () => {
    setOpen(false);

    if (!user) {
      alert('No user is currently signed in.');
      return;
    }

    try {
      const res = await API.get('/auth/me');
      const account = res?.user?.email || user?.email || user?.displayName || 'your account';
      alert(`Connected to signed-in account: ${account}`);
    } catch (err) {
      alert(`Could not verify backend account connection: ${err.message}`);
    }
  };

  const accountLabel = user ? 'Signed in' : 'Not signed in';

  const items = [
    {
      icon: <Database size={15} />,
      label: accountLabel,
      sublabel: user ? 'Connected to your backend account' : 'Please sign in',
      action: handleAccountStatusClick,
    },
    { divider: true },
    ...(user
      ? [{
          icon:<Trash2 size={15}/> ,
          label:'Sign out',
          sublabel:'Sign out from this account',
          danger: true,
          action: async () => { setOpen(false); await signOutUser(); },
        }]
      : []),
    {
      icon:<Settings size={15}/>,
      label:'Settings',
      sublabel:'Theme, currency, backup & more',
      action: () => { setOpen(false); setSettingsOpen(true); },
    },
    {
      icon:<Info size={15}/>,
      label:'About',
      sublabel:'Version, features, tech stack',
      action: () => { setOpen(false); setAboutOpen(true); },
    },
    {
      icon:<HelpCircle size={15}/>,
      label:'Support',
      sublabel:'Quick link for help & feedback',
      action: () => { setOpen(false); setSupportOpen(true); },
    },
  ];

  return (
    <>
      <div ref={ref} style={{ position:'relative' }}>
        {/* Pill button */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{ display:'flex', alignItems:'center', gap:'0.5rem', background: open ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:'99px', padding:'0.3rem 0.7rem 0.3rem 0.3rem', cursor:'pointer', color:'var(--text-main)', boxShadow: open ? '0 10px 30px rgba(59,130,246,0.18)' : 'none', transition:'all 0.22s' }}
        >
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.75rem' }}>
            {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <span style={{ fontWeight:600, fontSize:'0.82rem', maxWidth:'110px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {user?.displayName || user?.email || 'User'}
          </span>
          <ChevronDown size={13} style={{ opacity:0.6, transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, minWidth:'330px', background:'var(--bg-secondary)', border:'1px solid var(--glass-border)', borderRadius:'16px', boxShadow:'0 24px 64px rgba(2,6,23,0.4)', overflow:'hidden', zIndex:1000, animation:'fadeUp 0.2s ease-out both' }}>
            {/* Header — shows current theme icon */}
            <div style={{ padding:'1rem 1.1rem', borderBottom:'1px solid var(--glass-border)', background:'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(139,92,246,0.12))', display:'flex', alignItems:'center', gap:'0.7rem' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700 }}>
                {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:'0.875rem' }}>{user?.displayName || user?.email || 'User'}</p>
                <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                  {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </p>
              </div>
            </div>

            {/* Items */}
            <div style={{ padding:'0.5rem' }}>
              {items.map((item, i) =>
                item.divider
                  ? <div key={i} style={{ height:'1px', background:'var(--glass-border)', margin:'0.35rem 0' }}/>
                  : (
                    <button
                      key={i}
                      onClick={item.action}
                      style={{
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'space-between',
                        width:'100%',
                        padding:'0.7rem 0.9rem',
                        background:'transparent',
                        border:'none',
                        cursor:'pointer',
                        borderRadius:'var(--radius-md)',
                        color: item.danger ? 'var(--danger)' : 'var(--text-sub)',
                        fontSize:'0.86rem',
                        fontWeight:500,
                        textAlign:'left',
                        transition:'background 0.15s, transform 0.1s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.11)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                        <span style={{ opacity:0.8 }}>{item.icon}</span>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
                          <span>{item.label}</span>
                          {item.sublabel && (
                            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.05rem' }}>
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      {!item.danger && <ChevronRight size={13} style={{ opacity:0.3 }}/>}
                    </button>
                  )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutModal    open={aboutOpen}    onClose={() => setAboutOpen(false)} />
      <SupportModal  open={supportOpen}  onClose={() => setSupportOpen(false)} />
    </>
  );
};

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout = () => {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState('');
  const displayTitle = pageTitle || routeTitles[location.pathname] || 'Expense Manager';

  return (
    <PageTitleContext.Provider value={{ title: displayTitle, setTitle: setPageTitle }}>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {/* Sticky topbar */}
          <header className="topbar">
            <span className="topbar-title">{displayTitle}</span>
            <span className="desktop-only" style={{ flex:1 }}/>
            <AccountMenu />
          </header>
          <div className="page-body animate-fade-in">
            <div className="content-shell">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </PageTitleContext.Provider>
  );
};
export default Layout;