const User = require('../models/User');

async function getSummary(req, res) {
    try {
        const user = await User.findById(req.user.id).select('summary');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            summary: {
                balance: Number(user.summary?.balance ?? 4250),
                income: Number(user.summary?.income ?? 3200),
                credit: Number(user.summary?.credit ?? 450),
            },
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
    }
}

async function setSummary(req, res) {
    try {
        const balance = Number(req.body.balance ?? 4250);
        const income = Number(req.body.income ?? 3200);
        const credit = Number(req.body.credit ?? 450);

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { summary: { balance, income, credit } } },
            { new: true }
        ).select('summary');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            summary: {
                balance: Number(user.summary?.balance ?? balance),
                income: Number(user.summary?.income ?? income),
                credit: Number(user.summary?.credit ?? credit),
            },
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save summary', error: error.message });
    }
}

module.exports = { getSummary, setSummary };
