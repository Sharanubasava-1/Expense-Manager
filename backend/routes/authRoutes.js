const express = require('express');
const { signup, login, me, logout, deleteAccount } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.delete('/account', authMiddleware, deleteAccount);
router.post('/delete-account', authMiddleware, deleteAccount);

module.exports = router;
