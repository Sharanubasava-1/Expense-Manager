const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { listRules, upsertRule, deleteRule, setRuleActive } = require('../controllers/recurringController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listRules);
router.post('/', upsertRule);
router.delete('/:id', deleteRule);
router.patch('/:id/active', setRuleActive);

module.exports = router;
