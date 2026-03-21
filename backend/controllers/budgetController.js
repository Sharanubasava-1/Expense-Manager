const Budget = require('../models/Budget');

function mapBudget(doc) {
    return {
        id: String(doc._id),
        month: doc.month,
        category: doc.category,
        limit: Number(doc.limit || 0),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

async function listBudgets(req, res) {
    try {
        const month = String(req.query.month || '').trim();
        const filter = { userId: req.user.id };
        if (month) filter.month = month;

        const docs = await Budget.find(filter).sort({ month: -1, createdAt: -1 });
        const budgets = docs.map(mapBudget);
        return res.status(200).json({ budgets, data: budgets });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to list budgets', error: error.message });
    }
}

async function upsertBudget(req, res) {
    try {
        const payload = req.body || {};
        const month = String(payload.month || '').slice(0, 7);
        const category = payload.category === null || payload.category === undefined || payload.category === ''
            ? null
            : String(payload.category);
        const limit = Number(payload.limit || 0);

        if (!month) {
            return res.status(400).json({ message: 'Month is required' });
        }

        let doc = null;
        if (payload.id) {
            doc = await Budget.findOneAndUpdate(
                { _id: payload.id, userId: req.user.id },
                { $set: { month, category, limit } },
                { new: true }
            );
        }

        if (!doc) {
            doc = await Budget.findOneAndUpdate(
                { userId: req.user.id, month, category },
                { $set: { limit } },
                { new: true }
            );
        }

        if (!doc) {
            doc = await Budget.create({ userId: req.user.id, month, category, limit });
        }

        return res.status(200).json({ budget: mapBudget(doc) });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save budget', error: error.message });
    }
}

async function deleteBudget(req, res) {
    try {
        const deleted = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deleted) {
            return res.status(404).json({ message: 'Budget not found' });
        }
        return res.status(200).json({ message: 'Budget deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to delete budget', error: error.message });
    }
}

module.exports = { listBudgets, upsertBudget, deleteBudget };
