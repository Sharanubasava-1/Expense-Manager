import API from '../api/api';

export async function listBudgets() {
    const res = await API.get('/budgets');
    return Array.isArray(res?.budgets) ? res.budgets : [];
}

export async function upsertBudget({ id, month, category = null, limit }) {
    const payload = {
        ...(id ? { id } : {}),
        month: String(month), // YYYY-MM
        category: category ? String(category) : null,
        limit: Number(limit || 0),
    };
    const res = await API.post('/budgets', payload);
    return res?.budget;
}

export async function deleteBudget(id) {
    await API.delete(`/budgets/${id}`);
}

export async function getBudgetsForMonth(month) {
    const res = await API.get(`/budgets?month=${encodeURIComponent(String(month))}`);
    return Array.isArray(res?.budgets) ? res.budgets : [];
}