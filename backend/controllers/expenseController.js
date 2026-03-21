const Expense = require('../models/Expense');

function mapExpense(doc) {
    return {
        id: String(doc._id),
        title: doc.title,
        amount: doc.amount,
        date: doc.date,
        category: doc.category,
        notes: doc.notes,
        merchant: doc.merchant,
        source: doc.source,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

async function listExpenses(req, res) {
    try {
        const docs = await Expense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
        const expenses = docs.map(mapExpense);
        return res.status(200).json({ expenses, data: expenses });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to list expenses', error: error.message });
    }
}

async function createExpense(req, res) {
    try {
        const payload = req.body || {};
        const title = String(payload.title || '').trim();
        const amount = Number(payload.amount || 0);
        const date = String(payload.date || '').slice(0, 10);

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const doc = await Expense.create({
            userId: req.user.id,
            title,
            amount,
            date,
            category: String(payload.category || 'Other'),
            notes: String(payload.notes || ''),
            merchant: String(payload.merchant || ''),
            source: String(payload.source || 'manual'),
            status: String(payload.status || 'Approved'),
        });

        return res.status(201).json({ expense: mapExpense(doc) });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to create expense', error: error.message });
    }
}

async function deleteExpense(req, res) {
    try {
        const { id } = req.params;
        const deleted = await Expense.findOneAndDelete({ _id: id, userId: req.user.id });
        if (!deleted) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        return res.status(200).json({ message: 'Expense deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to delete expense', error: error.message });
    }
}

async function updateExpense(req, res) {
    try {
        const { id } = req.params;
        const payload = req.body || {};
        const updates = {
            title: String(payload.title || '').trim(),
            amount: Number(payload.amount || 0),
            date: String(payload.date || '').slice(0, 10),
            category: String(payload.category || 'Other'),
            notes: String(payload.notes || ''),
            merchant: String(payload.merchant || ''),
            source: String(payload.source || 'manual'),
            status: String(payload.status || 'Approved'),
        };

        if (!updates.title) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (!updates.date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const doc = await Expense.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { $set: updates },
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.status(200).json({ expense: mapExpense(doc) });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update expense', error: error.message });
    }
}

module.exports = { listExpenses, createExpense, deleteExpense, updateExpense };
