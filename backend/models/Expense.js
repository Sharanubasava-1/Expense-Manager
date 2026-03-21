const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        date: { type: String, required: true },
        category: { type: String, default: 'Other' },
        notes: { type: String, default: '' },
        merchant: { type: String, default: '' },
        source: { type: String, default: 'manual' },
        status: { type: String, default: 'Approved' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
