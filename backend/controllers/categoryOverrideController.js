const CategoryOverride = require('../models/CategoryOverride');

function normalizeKey(input) {
    return String(input || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .slice(0, 80);
}

async function getOverride(req, res) {
    try {
        const key = normalizeKey(req.query.key);
        if (!key) {
            return res.status(200).json({ category: null });
        }

        const row = await CategoryOverride.findOne({ userId: req.user.id, normalizedKey: key });
        return res.status(200).json({ category: row?.category || null });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to load category override', error: error.message });
    }
}

async function setOverride(req, res) {
    try {
        const key = normalizeKey(req.body.key);
        const category = String(req.body.category || 'Other');
        if (!key) {
            return res.status(400).json({ message: 'key is required' });
        }

        await CategoryOverride.findOneAndUpdate(
            { userId: req.user.id, normalizedKey: key },
            { $set: { category } },
            { upsert: true, new: true }
        );

        return res.status(200).json({ key, category });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save category override', error: error.message });
    }
}

module.exports = { getOverride, setOverride, normalizeKey };
