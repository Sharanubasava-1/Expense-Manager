import { addExpense } from '../data/expensesRepo';
import { computeNextRun, listRecurringRules, upsertRecurringRule } from '../data/recurringRepo';

const isoDay = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

/**
 * Best-effort local scheduler.
 * Runs on app start to backfill any missed recurring expenses.
 */
export async function runRecurringScheduler() {
    const today = isoDay();
    const rules = await listRecurringRules();
    for (const rule of rules) {
        if (!rule.active) continue;
        let next = String(rule.nextRunAt || today).slice(0, 10);
        let guard = 0;

        while (next <= today && guard < 24) {
            await addExpense({
                title: rule.title,
                amount: rule.amount,
                date: next,
                category: rule.category,
                notes: rule.notes ? `${rule.notes} (Recurring)` : 'Recurring',
                source: 'recurring',
            });

            next = computeNextRun(rule, next);
            guard++;
        }

        if (next !== rule.nextRunAt) {
            await upsertRecurringRule({ ...rule, nextRunAt: next });
        }
    }
}