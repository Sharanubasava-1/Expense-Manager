const express = require('express');
const { listExpenses, createExpense, deleteExpense, updateExpense } = require('../controllers/expenseController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listExpenses);
router.post('/', createExpense);
router.post('/add', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
