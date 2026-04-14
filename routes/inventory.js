const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { validateFacilityId } = require('../middleware/validation');

const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

// IMPORTANT: Static routes must be defined BEFORE parameterized routes (:facilityId)
// to prevent Express from treating "search" as a facilityId parameter
router.get('/search', protect, authorize(ROLES.DOCTOR, ROLES.ADMIN, ROLES.PHARMACIST), inventoryController.searchDrugAvailability);
router.get('/:facilityId', validateFacilityId, inventoryController.getFacilityInventory);
router.post('/:facilityId/update', 
  protect, 
  authorize(ROLES.PHARMACIST, ROLES.ADMIN), 
  validateFacilityId, 
  inventoryController.updateStock
);

module.exports = router;
