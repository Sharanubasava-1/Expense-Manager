export function parseVoiceExpense(text) {
    const raw = String(text || '').trim();
    if (!raw) return { title: '', amount: null, categoryHint: null, raw };

    // Normalize common prefixes
    let t = raw.replace(/^add\s+/i, '').trim();

    // Amount extraction (supports "₹250", "250", "rs 250", "inr 250")
    const amtRe = /(?:₹\s*|rs\.?\s*|inr\s*)?(\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{1,2})?)/i;
    const m = t.match(amtRe);
    let amount = null;
    if (m) {
        amount = Number(String(m[1]).replace(/[,\s]/g, ''));
        t = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
    }

    // Lightweight category hint
    const lc = t.toLowerCase();
    const categoryHint =
        /\b(lunch|dinner|breakfast|cafe|coffee|restaurant|swiggy|zomato)\b/.test(lc) ? 'Food' :
            /\b(uber|ola|metro|bus|train|cab|taxi|fuel|petrol|parking|toll)\b/.test(lc) ? 'Transport' :
                /\b(amazon|flipkart|myntra|shopping|store|mall)\b/.test(lc) ? 'Shopping' :
                    /\b(subscription|license|hosting|domain|netflix|spotify|adobe|microsoft|github)\b/.test(lc) ? 'Software' :
                        null;

    return {
        title: t || raw,
        amount: Number.isFinite(amount) ? amount : null,
        categoryHint,
        raw,
    };
}