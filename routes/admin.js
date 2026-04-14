const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

// Force protection and admin-only authorization for all admin routes
router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.get('/global-inventory', adminController.getGlobalInventory);
router.get('/facility-health', adminController.getFacilityHealth);
router.get('/global-alerts', adminController.getGlobalAlerts);

module.exports = router;
