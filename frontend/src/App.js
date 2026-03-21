import React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Expenses from './components/Expenses';
import AddExpense from './components/AddExpense';
import Scanner from './components/Scanner';
import Recurring from './components/Recurring';

function App() {
    return (
        <Router>
            <div className="app-layout">
                <Sidebar />
                <div className="main-content">
                    <div className="page-body">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/add" element={<AddExpense />} />
                            <Route path="/scanner" element={<Scanner />} />
                            <Route path="/budgets" element={<div>Budgets Page</div>} />
                            <Route path="/recurring" element={<Recurring />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </Router>
    );
}

export default App;