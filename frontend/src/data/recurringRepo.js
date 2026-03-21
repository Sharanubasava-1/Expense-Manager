import API from '../api/api';

const isoDay = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

export async function listRecurringRules() {
    const res = await API.get('/recurring');
    return Array.isArray(res?.rules) ? res.rules : [];
}

export async function upsertRecurringRule(input) {
    const payload = {
        ...(input.id ? { id: input.id } : {}),
        title: String(input.title || ''),
        amount: Number(input.amount || 0),
        category: String(input.category || 'Other'),
        notes: String(input.notes || ''),
        cadence: input.cadence === 'weekly' ? 'weekly' : 'monthly',
        dayOfMonth: input.dayOfMonth ? Number(input.dayOfMonth) : undefined,
        dayOfWeek: input.dayOfWeek !== undefined ? Number(input.dayOfWeek) : undefined,
        nextRunAt: String(input.nextRunAt || isoDay()),
        active: input.active !== false,
    };
    const res = await API.post('/recurring', payload);
    return res?.rule;
}

export async function deleteRecurringRule(id) {
    await API.delete(`/recurring/${id}`);
}

export async function setRecurringRuleActive(id, active) {
    await API.patch(`/recurring/${id}/active`, { active: !!active });
}

export function computeNextRun(rule, fromDateIso) {
    const from = new Date(fromDateIso);
    if (rule.cadence === 'weekly') {
        const targetDow = Number.isFinite(rule.dayOfWeek) ? rule.dayOfWeek : from.getDay();
        const d = new Date(from);
        d.setDate(d.getDate() + 1);
        while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
        return isoDay(d);
    }

    const dom = Number.isFinite(rule.dayOfMonth) ? rule.dayOfMonth : from.getDate();
    const d = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dom, daysInMonth));
    return isoDay(d);
}
