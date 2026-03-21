const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { listBudgets, upsertBudget, deleteBudget } = require('../controllers/budgetController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listBudgets);
router.post('/', upsertBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
