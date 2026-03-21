import { listExpenses } from '../data/expensesRepo';
import { listRecurringRules } from '../data/recurringRepo';
import { getSummary } from '../data/summaryRepo';

function isoDay(d = new Date()) { return new Date(d).toISOString().slice(0, 10); }

export async function getSpendingVelocity(days = 7) {
    const today = new Date();
    const end = isoDay(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - days);
    const start = isoDay(startDate);
    const prev = isoDay(prevStart);

    const all = await listExpenses();
    const priorEnd = new Date(startDate).toISOString().slice(0, 10);
    const recent = all.filter((e) => e.date >= start && e.date <= end);
    const prior = all.filter((e) => e.date >= prev && e.date < priorEnd);

    const recentSum = recent.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const priorSum = prior.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const change = priorSum === 0 ? (recentSum === 0 ? 0 : 100) : ((recentSum - priorSum) / Math.max(1, priorSum)) * 100;
    const trend = change > 5 ? 'accelerating' : change < -5 ? 'decelerating' : 'stable';

    return { days, recentSum, priorSum, change: Math.round(change), trend };
}

export async function comparePreviousMonthByCategory() {
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const all = await listExpenses();
    const current = {};
    const previous = {};

    for (const e of all) {
        const ym = String(e.date || '').slice(0, 7);
        const cat = e.category || 'Other';
        if (ym === curYm) current[cat] = (current[cat] || 0) + (Number(e.amount) || 0);
        if (ym === prevYm) previous[cat] = (previous[cat] || 0) + (Number(e.amount) || 0);
    }

    return { current, previous };
}

export async function moneyLeftToSpend() {
    const summary = await getSummary();
    const ym = new Date().toISOString().slice(0, 7);
    const from = `${ym}-01`;
    const to = `${ym}-31`;
    const allExpenses = await listExpenses();
    const thisMonth = allExpenses.filter((e) => e.date >= from && e.date <= to);
    const spent = thisMonth.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const recurring = await listRecurringRules();
    const activeRecurring = recurring.filter(r => r.active === true);
    const monthlyRecurring = activeRecurring.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const moneyLeft = Number(summary.income || 0) - spent - monthlyRecurring;
    return { income: Number(summary.income || 0), spent, monthlyRecurring, moneyLeft };
}

export async function savingsRatePercentage() {
    const summary = await getSummary();
    const ym = new Date().toISOString().slice(0, 7);
    const from = `${ym}-01`;
    const to = `${ym}-31`;
    const allExpenses = await listExpenses();
    const thisMonth = allExpenses.filter((e) => e.date >= from && e.date <= to);
    const spent = thisMonth.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const income = Number(summary.income || 0) || 0;
    const rate = income === 0 ? 0 : Math.max(0, ((income - spent) / income) * 100);
    return Math.round(rate);
}

export async function predictiveAlert() {
    const ym = new Date().toISOString().slice(0, 7);
    const from = `${ym}-01`;
    const to = `${ym}-31`;
    const allExpenses = await listExpenses();
    const thisMonth = allExpenses.filter((e) => e.date >= from && e.date <= to);
    const spent = thisMonth.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const today = new Date();
    const day = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projected = Math.round((spent / Math.max(1, day)) * daysInMonth);
    return { spent, day, daysInMonth, projected, message: `You're on track to spend ₹${projected} this month` };
}
