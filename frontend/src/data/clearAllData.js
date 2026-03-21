import API from '../api/api';
import { db } from './db';

async function deleteAllExpenses() {
    const res = await API.get('/expenses');
    const expenses = Array.isArray(res?.expenses) ? res.expenses : (Array.isArray(res?.data) ? res.data : []);
    await Promise.all(expenses.map((e) => API.delete(`/expenses/${e.id || e._id}`)));
}

async function deleteAllBudgets() {
    const res = await API.get('/budgets');
    const budgets = Array.isArray(res?.budgets) ? res.budgets : (Array.isArray(res?.data) ? res.data : []);
    await Promise.all(budgets.map((b) => API.delete(`/budgets/${b.id || b._id}`)));
}

async function deleteAllRecurringRules() {
    const res = await API.get('/recurring');
    const rules = Array.isArray(res?.rules) ? res.rules : (Array.isArray(res?.data) ? res.data : []);
    await Promise.all(rules.map((r) => API.delete(`/recurring/${r.id || r._id}`)));
}

async function resetSummary() {
    await API.put('/summary', {
        balance: 0,
        income: 0,
        credit: 0,
    });
}

export async function clearLocalCaches() {
    await Promise.allSettled([
        db.expenses.clear(),
        db.budgets.clear(),
        db.recurringRules.clear(),
        db.categoryOverrides.clear(),
        db.syncOutbox.clear(),
    ]);

    localStorage.removeItem('em_transactions');
    localStorage.removeItem('expenses');
}

export async function clearAllUserData() {
    await deleteAllExpenses();
    await deleteAllBudgets();
    await deleteAllRecurringRules();
    await resetSummary();
    await clearLocalCaches();
}

export async function deleteCurrentAccount() {
    try {
        await API.delete('/auth/account');
        return;
    } catch (err) {
        const msg = String(err?.message || '');
        if (!msg.includes('(404)')) {
            throw err;
        }
    }

    // Fallback for environments where DELETE route is unavailable.
    await API.post('/auth/delete-account', {});
}
