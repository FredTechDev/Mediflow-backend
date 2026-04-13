const express = require('express');
const router = express.Router();
const redistributionController = require('../controllers/redistributionController');

const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.get('/match', protect, authorize(ROLES.MANAGER, ROLES.SUPPLY_OFFICER, ROLES.ADMIN, ROLES.GOVERNMENT), redistributionController.findSurplusAndShortage);
router.post('/transfer', protect, authorize(ROLES.MANAGER, ROLES.SUPPLY_OFFICER, ROLES.ADMIN), redistributionController.generateTransferPlan);

module.exports = router;
