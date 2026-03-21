import API from '../api/api';
import { listBudgets, upsertBudget } from './budgetsRepo';
import { listRecurringRules, upsertRecurringRule } from './recurringRepo';
import { getSummary, setSummary } from './summaryRepo';

// Static rates represented as INR per 1 unit of currency.
export const INR_PER_CURRENCY = {
    INR: 1,
    USD: 91,
    EUR: 99,
    GBP: 116,
    JPY: 0.61,
    AUD: 60,
    CAD: 67,
    SGD: 68,
    AED: 24.8,
};

const DECIMALS_BY_CURRENCY = {
    JPY: 0,
};

function roundForCurrency(value, code) {
    const decimals = DECIMALS_BY_CURRENCY[code] ?? 2;
    const factor = 10 ** decimals;
    return Math.round((Number(value) || 0) * factor) / factor;
}

export function convertAmount(value, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return Number(value) || 0;

    const fromRate = INR_PER_CURRENCY[fromCurrency];
    const toRate = INR_PER_CURRENCY[toCurrency];
    if (!fromRate || !toRate) {
        throw new Error(`Unsupported currency conversion: ${fromCurrency} -> ${toCurrency}`);
    }

    const amount = Number(value) || 0;
    const inInr = amount * fromRate;
    return inInr / toRate;
}

async function convertExpenses(fromCurrency, toCurrency) {
    const res = await API.get('/expenses');
    const expenses = Array.isArray(res?.expenses) ? res.expenses : [];

    await Promise.all(expenses.map(async (e) => {
        const id = e._id || e.id;
        if (!id) return;

        const nextAmount = roundForCurrency(convertAmount(e.amount, fromCurrency, toCurrency), toCurrency);
        await API.put(`/expenses/${id}`, {
            title: e.title,
            amount: nextAmount,
            date: e.date,
            category: e.category,
            notes: e.notes,
            merchant: e.merchant || undefined,
        });
    }));
}

async function convertBudgets(fromCurrency, toCurrency) {
    const budgets = await listBudgets();

    await Promise.all(budgets.map(async (b) => {
        const id = b.id || b._id;
        if (!id) return;

        const nextLimit = roundForCurrency(convertAmount(b.limit, fromCurrency, toCurrency), toCurrency);
        await upsertBudget({
            id,
            month: b.month,
            category: b.category || null,
            limit: nextLimit,
        });
    }));
}

async function convertRecurring(fromCurrency, toCurrency) {
    const rules = await listRecurringRules();

    await Promise.all(rules.map(async (r) => {
        const id = r.id || r._id;
        if (!id) return;

        const nextAmount = roundForCurrency(convertAmount(r.amount, fromCurrency, toCurrency), toCurrency);
        await upsertRecurringRule({
            id,
            title: r.title,
            amount: nextAmount,
            category: r.category,
            notes: r.notes,
            cadence: r.cadence,
            dayOfMonth: r.dayOfMonth,
            dayOfWeek: r.dayOfWeek,
            nextRunAt: r.nextRunAt,
            active: r.active,
        });
    }));
}

async function convertSummary(fromCurrency, toCurrency) {
    const s = await getSummary();
    const payload = {
        balance: roundForCurrency(convertAmount(s.balance, fromCurrency, toCurrency), toCurrency),
        income: roundForCurrency(convertAmount(s.income, fromCurrency, toCurrency), toCurrency),
        credit: roundForCurrency(convertAmount(s.credit, fromCurrency, toCurrency), toCurrency),
    };
    await setSummary(payload);
}

export async function convertAllFinancialData(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return;

    await convertExpenses(fromCurrency, toCurrency);
    await convertBudgets(fromCurrency, toCurrency);
    await convertRecurring(fromCurrency, toCurrency);
    await convertSummary(fromCurrency, toCurrency);
}
