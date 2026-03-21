import { useRef, useState } from 'react';
import { X, Camera as CameraIcon, Loader } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Tesseract from 'tesseract.js';

export default function AddTransactionModal({ onClose }) {
  const { addTransaction, settings } = useAppContext();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    title: ''
  });
  const [isScanning, setIsScanning] = useState(false);

  const categories = {
    expense: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Other'],
    income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Other']
  };

  const currentCategories = categories[formData.type];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.title) return;
    addTransaction({
      ...formData,
      amount: parseFloat(formData.amount)
    });
    onClose();
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

  const handleScanReceipt = () => {
    fileInputRef.current?.click();
  };

  const handleReceiptFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await fileToDataUrl(file);

      setIsScanning(true);

      // Process uploaded image with Tesseract.js
      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng'
      );
      
      const text = result.data.text;
      
      // 3. Extract the highest decimal number to assume it's the Total
      const matches = text.match(/\d+[.,]\d{2}/g); // matches numbers like 12.50 or 12,50
      
      if (matches && matches.length > 0) {
        // Replace commas with dots and convert to Number
        const numbers = matches.map(str => Number(str.replace(',', '.')));
        const maxAmount = Math.max(...numbers);
        
        setFormData(prev => ({ 
          ...prev, 
          amount: String(maxAmount), 
          title: prev.title || 'Scanned Receipt', 
          type: 'expense' 
        }));
      } else {
        alert('Could not detect a valid amount on the receipt. Please enter manually.');
      }
    } catch (e) {
      console.error('OCR Error: ', e);
      alert('Image scanning failed.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        
        {isScanning && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--card-radius)' }}>
            <Loader size={48} className="text-accent-color animate-spin" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem', color: 'var(--accent-color)' }} />
            <h3 style={{ color: 'white' }}>Analyzing Receipt...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Extracting details using AI</p>
          </div>
        )}

        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Add Record</h2>
          <button className="btn-ghost" style={{ padding: '0.2rem', borderRadius: '50%' }} onClick={onClose} disabled={isScanning}>
            <X size={20} />
          </button>
        </div>

        <button 
          onClick={handleScanReceipt} 
          type="button" 
          disabled={isScanning}
          className="btn" 
          style={{ width: '100%', marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-color)', border: '1px dashed var(--accent-color)' }}
        >
          <CameraIcon size={20} />
          Scan Receipt
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleReceiptFileChange}
          style={{ display: 'none' }}
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2" style={{ background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '12px' }}>
            <button
              type="button"
              className={`btn flex-1 ${formData.type === 'expense' ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setFormData({ ...formData, type: 'expense', category: categories['expense'][0] })}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn flex-1 ${formData.type === 'income' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFormData({ ...formData, type: 'income', category: categories['income'][0] })}
              style={formData.type === 'income' ? { background: 'var(--success-color)' } : {}}
            >
              Income
            </button>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Amount ({settings.currency})
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Title
            </label>
            <input
              type="text"
              placeholder="E.g., Grocery Shopping"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {currentCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={isScanning}>
            Save Record
          </button>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}