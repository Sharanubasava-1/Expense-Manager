import API from '../api/api';

export function normalizeKey(input) {
    return String(input || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .slice(0, 80);
}

export async function getCategoryOverride(key) {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return null;
    const res = await API.get(`/category-overrides?key=${encodeURIComponent(normalizedKey)}`);
    return res?.category || null;
}

export async function setCategoryOverride(key, category) {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return;
    await API.post('/category-overrides', {
        key: normalizedKey,
        category: String(category || 'Other'),
    });
}
