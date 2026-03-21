import Dexie from 'dexie';

/**
 * IndexedDB schema (offline-first).
 *
 * Notes:
 * - We keep `date` as ISO `YYYY-MM-DD` (same as current UI form).
 * - We keep `createdAt/updatedAt` as ISO strings for ordering/sync.
 */
export const db = new Dexie('expense_manager');

db.version(1).stores({
    expenses: 'id, date, category, createdAt, updatedAt',
    budgets: 'id, month, category, updatedAt',
    recurringRules: 'id, nextRunAt, active, updatedAt',
    categoryOverrides: 'id, normalizedKey, category, updatedAt',
    kv: 'key',
});

db.version(2).stores({
    expenses: 'id, date, category, createdAt, updatedAt',
    budgets: 'id, month, category, updatedAt',
    recurringRules: 'id, nextRunAt, active, updatedAt',
    categoryOverrides: 'id, normalizedKey, category, updatedAt',
    syncOutbox: '++oid, entity, entityId, op, createdAt',
    kv: 'key',
});

/**
 * One-time migration from legacy `localStorage` keys.
 * Safe to call on every app start.
 */
export async function migrateFromLocalStorage() {
    const migratedFlag = await db.kv.get('migrated_v1');
    if (migratedFlag?.value) return;

    const legacyRaw = localStorage.getItem('expenses');
    if (!legacyRaw) {
        await db.kv.put({ key: 'migrated_v1', value: true, at: new Date().toISOString() });
        return;
    }

    let legacy;
    try {
        legacy = JSON.parse(legacyRaw);
    } catch {
        legacy = [];
    }
    if (!Array.isArray(legacy) || legacy.length === 0) {
        await db.kv.put({ key: 'migrated_v1', value: true, at: new Date().toISOString() });
        return;
    }

    const now = new Date().toISOString();
    const normalized = legacy
        .filter(Boolean)
        .map((e) => {
            const id = String(e._id || e.id || crypto.randomUUID?.() || Date.now());
            const date =
                typeof e.date === 'string'
                    ? e.date.slice(0, 10)
                    : new Date().toISOString().slice(0, 10);
            return {
                id,
                title: String(e.title || ''),
                amount: Number(e.amount || 0),
                date,
                category: String(e.category || 'Other'),
                notes: String(e.notes || ''),
                merchant: e.merchant ? String(e.merchant) : undefined,
                source: e.source ? String(e.source) : 'manual',
                status: e.status ? String(e.status) : undefined,
                createdAt: e.createdAt ? String(e.createdAt) : now,
                updatedAt: e.updatedAt ? String(e.updatedAt) : now,
            };
        });

    await db.transaction('rw', db.expenses, db.kv, async () => {
        const existingCount = await db.expenses.count();
        if (existingCount === 0) {
            await db.expenses.bulkPut(normalized);
        }
        await db.kv.put({ key: 'migrated_v1', value: true, at: now });
    });
}
