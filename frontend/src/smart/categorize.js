import { getCategoryOverride, normalizeKey } from '../data/categoryOverridesRepo';

const RULES = [
    { category: 'Food', score: 3, re: /\b(lunch|dinner|breakfast|cafe|coffee|tea|restaurant|swiggy|zomato|pizza|burger|meal|snack)\b/i },
    { category: 'Transport', score: 3, re: /\b(uber|ola|metro|bus|train|flight|cab|taxi|fuel|petrol|diesel|parking|toll)\b/i },
    { category: 'Shopping', score: 3, re: /\b(amazon|flipkart|myntra|shopping|store|mall|clothes|shoes|fashion|order)\b/i },
    { category: 'Equipment', score: 3, re: /\b(laptop|mouse|keyboard|monitor|ssd|hard\s*disk|router|headphones|earbuds|chair|desk)\b/i },
    { category: 'Software', score: 3, re: /\b(subscription|license|saas|cloud|hosting|domain|github|figma|notion|adobe|microsoft|google one|netflix|spotify)\b/i },
];

function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}

export async function suggestCategory({ title, merchant, notes } = {}) {
    const key = normalizeKey(merchant || title);
    const learned = await getCategoryOverride(key);
    if (learned) {
        return { category: learned, confidence: 0.92, reason: 'learned' };
    }

    const text = `${title || ''} ${merchant || ''} ${notes || ''}`.trim();
    if (!text) return { category: 'Other', confidence: 0.2, reason: 'empty' };

    const scores = new Map();
    for (const r of RULES) {
        if (r.re.test(text)) {
            scores.set(r.category, (scores.get(r.category) || 0) + r.score);
        }
    }
    if (scores.size === 0) return { category: 'Other', confidence: 0.35, reason: 'no_match' };

    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [bestCategory, bestScore] = sorted[0];
    const confidence = clamp01(0.45 + bestScore / 10);

    return { category: bestCategory, confidence, reason: 'rules' };
}