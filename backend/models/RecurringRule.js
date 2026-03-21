const mongoose = require('mongoose');

const recurringRuleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        category: { type: String, default: 'Other' },
        notes: { type: String, default: '' },
        cadence: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
        dayOfMonth: { type: Number, default: null },
        dayOfWeek: { type: Number, default: null },
        nextRunAt: { type: String, required: true },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('RecurringRule', recurringRuleSchema);
