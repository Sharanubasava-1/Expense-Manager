const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getOverride, setOverride } = require('../controllers/categoryOverrideController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getOverride);
router.post('/', setOverride);

module.exports = router;
