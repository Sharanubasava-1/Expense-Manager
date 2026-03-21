const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        month: { type: String, required: true },
        category: { type: String, default: null },
        limit: { type: Number, required: true, min: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
