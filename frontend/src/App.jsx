import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import ReceiptScanner from './pages/ReceiptScanner';
import Budgets from './pages/Budgets';
import Recurring from './pages/Recurring';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';
import { migrateFromLocalStorage } from './data/db';
import { runRecurringScheduler } from './smart/recurringScheduler';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/AuthContext';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  
  if (user === null) {
    return null; // Loading state
  }
  
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  if (typeof user === 'undefined') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.2rem',
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        Loading...
      </div>
    );
  }

  // If not logged in, show auth pages only
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If logged in, show main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/expenses"    element={<Expenses />} />
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="/scan-receipt" element={<ReceiptScanner />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/recurring" element={<Recurring />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    (async () => {
      try {
        await migrateFromLocalStorage();
        await runRecurringScheduler();
      } catch (err) {
        console.error('Initialization error:', err);
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;