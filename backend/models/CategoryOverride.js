const mongoose = require('mongoose');

const categoryOverrideSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        normalizedKey: { type: String, required: true, trim: true },
        category: { type: String, required: true, default: 'Other' },
    },
    { timestamps: true }
);

categoryOverrideSchema.index({ userId: 1, normalizedKey: 1 }, { unique: true });

module.exports = mongoose.model('CategoryOverride', categoryOverrideSchema);
