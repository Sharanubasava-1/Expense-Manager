const RecurringRule = require('../models/RecurringRule');

function mapRule(doc) {
    return {
        id: String(doc._id),
        title: doc.title,
        amount: Number(doc.amount || 0),
        category: doc.category,
        notes: doc.notes,
        cadence: doc.cadence,
        dayOfMonth: doc.dayOfMonth,
        dayOfWeek: doc.dayOfWeek,
        nextRunAt: doc.nextRunAt,
        active: Boolean(doc.active),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

async function listRules(req, res) {
    try {
        const docs = await RecurringRule.find({ userId: req.user.id }).sort({ nextRunAt: 1, createdAt: 1 });
        const rules = docs.map(mapRule);
        return res.status(200).json({ rules, data: rules });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to list recurring rules', error: error.message });
    }
}

async function upsertRule(req, res) {
    try {
        const payload = req.body || {};
        const values = {
            title: String(payload.title || '').trim(),
            amount: Number(payload.amount || 0),
            category: String(payload.category || 'Other'),
            notes: String(payload.notes || ''),
            cadence: payload.cadence === 'weekly' ? 'weekly' : 'monthly',
            dayOfMonth: Number.isFinite(Number(payload.dayOfMonth)) ? Number(payload.dayOfMonth) : null,
            dayOfWeek: Number.isFinite(Number(payload.dayOfWeek)) ? Number(payload.dayOfWeek) : null,
            nextRunAt: String(payload.nextRunAt || '').slice(0, 10),
            active: payload.active !== false,
        };

        if (!values.title) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (!values.nextRunAt) {
            return res.status(400).json({ message: 'nextRunAt is required' });
        }

        let doc = null;
        if (payload.id) {
            doc = await RecurringRule.findOneAndUpdate(
                { _id: payload.id, userId: req.user.id },
                { $set: values },
                { new: true }
            );
        }

        if (!doc) {
            doc = await RecurringRule.create({ userId: req.user.id, ...values });
        }

        return res.status(200).json({ rule: mapRule(doc) });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save recurring rule', error: error.message });
    }
}

async function deleteRule(req, res) {
    try {
        const deleted = await RecurringRule.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deleted) {
            return res.status(404).json({ message: 'Recurring rule not found' });
        }
        return res.status(200).json({ message: 'Recurring rule deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to delete recurring rule', error: error.message });
    }
}

async function setRuleActive(req, res) {
    try {
        const active = Boolean(req.body.active);
        const doc = await RecurringRule.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: { active } },
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ message: 'Recurring rule not found' });
        }

        return res.status(200).json({ rule: mapRule(doc) });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to toggle recurring rule', error: error.message });
    }
}

module.exports = { listRules, upsertRule, deleteRule, setRuleActive };
