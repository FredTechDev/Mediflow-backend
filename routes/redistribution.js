const express = require('express');
const router = express.Router();
const redistributionController = require('../controllers/redistributionController');

router.get('/match', redistributionController.findSurplusAndShortage);
router.post('/transfer', redistributionController.generateTransferPlan);

module.exports = router;
