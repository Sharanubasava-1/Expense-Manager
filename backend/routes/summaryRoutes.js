const express = require('express');
const { getSummary, setSummary } = require('../controllers/summaryController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getSummary);
router.put('/', setSummary);

module.exports = router;
