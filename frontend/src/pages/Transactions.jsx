import { useState } from 'react';
import { Search, Trash2, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Transactions() {
  const { transactions, deleteTransaction, settings } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="animate-fade-in flex flex-col gap-6 h-full">
      <header className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '1rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '2rem' }}>All Transactions</h1>
        
        <div className="flex gap-4 items-center">
          <div className="relative flex items-center">
            <Search size={18} className="text-secondary" style={{ position: 'absolute', left: 12 }} />
            <input 
              type="text" 
              placeholder="Search tranasctions..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '250px' }}
            />
          </div>
          
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </header>

      <div className="glass-panel flex-1" style={{ overflowY: 'auto', padding: 0 }}>
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 text-secondary" style={{ height: '300px' }}>
            <Filter size={40} opacity={0.5} />
            <p>No transactions found.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1.25rem' }}>Date</th>
                <th style={{ padding: '1.25rem' }}>Title</th>
                <th style={{ padding: '1.25rem' }}>Category</th>
                <th style={{ padding: '1.25rem' }}>Type</th>
                <th style={{ padding: '1.25rem', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '1.25rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '1.25rem', color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ padding: '1.25rem', fontWeight: 500 }}>{t.title}</td>
                  <td style={{ padding: '1.25rem' }}>
                    <span style={{ padding: '4px 8px', background: 'var(--glass-bg)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      {t.category}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={`badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 'bold' }} className={t.type === 'income' ? 'text-success' : ''}>
                    {t.type === 'income' ? '+' : '-'}{settings.currency}{t.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <button 
                      className="btn-ghost" 
                      style={{ border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}
                      onClick={() => {
                        if (window.confirm('Delete this transaction?')) deleteTransaction(t.id);
                      }}
                    >
                      <Trash2 size={18} className="text-danger" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
