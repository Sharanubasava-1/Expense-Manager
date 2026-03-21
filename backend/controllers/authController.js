const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const RecurringRule = require('../models/RecurringRule');
const CategoryOverride = require('../models/CategoryOverride');

function signToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function toPublicUser(user) {
    return { id: String(user._id), email: user.email };
}

async function signup(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ email, passwordHash });
        const token = signToken(user._id);
        return res.status(201).json({ token, user: toPublicUser(user) });
    } catch (error) {
        return res.status(500).json({ message: 'Signup failed', error: error.message });
    }
}

async function login(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = signToken(user._id);
        return res.status(200).json({ token, user: toPublicUser(user) });
    } catch (error) {
        return res.status(500).json({ message: 'Login failed', error: error.message });
    }
}

async function me(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ user: toPublicUser(user) });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
}

function logout(_req, res) {
    return res.status(200).json({ message: 'Logout successful' });
}

async function deleteAccount(req, res) {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await Promise.all([
            Expense.deleteMany({ userId }),
            Budget.deleteMany({ userId }),
            RecurringRule.deleteMany({ userId }),
            CategoryOverride.deleteMany({ userId }),
            User.deleteOne({ _id: userId }),
        ]);

        return res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to delete account', error: error.message });
    }
}

module.exports = { signup, login, me, logout, deleteAccount };
