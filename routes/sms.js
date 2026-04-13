const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

router.post('/incoming', smsController.processSMS);
router.get('/history', smsController.getSMSHistory);
router.post('/simulate', smsController.simulateSMS); // For demo only

module.exports = router;
