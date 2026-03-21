const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        summary: {
            balance: { type: Number, default: 4250 },
            income: { type: Number, default: 3200 },
            credit: { type: Number, default: 450 },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
