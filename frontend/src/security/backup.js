import { db } from '../data/db';
import { decryptJsonWithPassword, encryptJsonWithPassword } from './crypto';

export async function buildBackupPayload() {
    const [expenses, budgets, recurringRules, categoryOverrides] = await Promise.all([
        db.expenses.toArray(),
        db.budgets.toArray(),
        db.recurringRules.toArray(),
        db.categoryOverrides.toArray(),
    ]);
    return {
        version: 2,
        exportedAt: new Date().toISOString(),
        data: { expenses, budgets, recurringRules, categoryOverrides },
    };
}

export async function exportPlainBackup() {
    return await buildBackupPayload();
}

export async function exportEncryptedBackup(password) {
    const payload = await buildBackupPayload();
    return await encryptJsonWithPassword(payload, password);
}

export async function importPlainBackup(payload) {
    const data = payload?.data || {};
    const expenses = Array.isArray(data.expenses) ? data.expenses : [];
    const budgets = Array.isArray(data.budgets) ? data.budgets : [];
    const recurringRules = Array.isArray(data.recurringRules) ? data.recurringRules : [];
    const categoryOverrides = Array.isArray(data.categoryOverrides) ? data.categoryOverrides : [];

    await db.transaction('rw', db.expenses, db.budgets, db.recurringRules, db.categoryOverrides, async () => {
        if (expenses.length) await db.expenses.bulkPut(expenses.map((e) => ({ ...e, id: String(e.id || e._id) })));
        if (budgets.length) await db.budgets.bulkPut(budgets);
        if (recurringRules.length) await db.recurringRules.bulkPut(recurringRules);
        if (categoryOverrides.length) await db.categoryOverrides.bulkPut(categoryOverrides);
    });
}

export async function importEncryptedBackup(envelope, password) {
    const payload = await decryptJsonWithPassword(envelope, password);
    await importPlainBackup(payload);
}
