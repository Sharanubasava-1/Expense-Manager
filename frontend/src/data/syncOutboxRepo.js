import { db } from './db';

export async function enqueueOutbox({ entity, entityId, op, payload }) {
    await db.syncOutbox.add({
        entity: String(entity),
        entityId: String(entityId),
        op: String(op), // 'upsert' | 'delete'
        payload: payload || null,
        createdAt: new Date().toISOString(),
    });
}

export async function listOutbox(limit = 50) {
    return await db.syncOutbox.orderBy('createdAt').limit(limit).toArray();
}

export async function deleteOutbox(oid) {
    await db.syncOutbox.delete(oid);
}
