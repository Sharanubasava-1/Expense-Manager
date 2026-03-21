import API from '../api/api';

const isoDay = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

function filterExpenses(arr, { from, to, category } = {}) {
    return arr.filter((e) => {
        if (from && e.date < from) return false;
        if (to && e.date > to) return false;
        if (category && e.category !== category) return false;
        return true;
    });
}

export async function listExpenses() {
    const res = await API.get('/expenses');
    return Array.isArray(res?.expenses) ? res.expenses : [];
}

export async function addExpense(input) {
    const payload = {
        title: String(input.title || ''),
        amount: Number(input.amount || 0),
        date: String(input.date || isoDay()).slice(0, 10),
        category: String(input.category || 'Other'),
        notes: String(input.notes || ''),
        merchant: input.merchant ? String(input.merchant) : undefined,
        source: input.source ? String(input.source) : 'manual',
        status: input.status ? String(input.status) : 'Approved',
    };
    const res = await API.post('/expenses', payload);
    return res?.expense;
}

export async function deleteExpense(id) {
    await API.delete(`/expenses/${id}`);
}

export async function sumExpenses({ from, to, category } = {}) {
    const arr = filterExpenses(await listExpenses(), { from, to, category });
    return arr.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

export async function totalsByCategory({ from, to } = {}) {
    const arr = filterExpenses(await listExpenses(), { from, to });
    return arr.reduce((acc, e) => {
        const k = e.category || 'Other';
        acc[k] = (acc[k] || 0) + (Number(e.amount) || 0);
        return acc;
    }, {});
}

export async function totalsByMonth({ monthsBack = 6 } = {}) {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - (monthsBack - 1));
    const from = isoDay(new Date(start.getFullYear(), start.getMonth(), 1));
    const arr = filterExpenses(await listExpenses(), { from });
    const by = new Map();
    for (const e of arr) {
        const ym = String(e.date).slice(0, 7); // YYYY-MM
        by.set(ym, (by.get(ym) || 0) + (Number(e.amount) || 0));
    }
    const out = [];
    for (let i = 0; i < monthsBack; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        out.push({ month: ym, total: by.get(ym) || 0 });
    }
    return out;
}