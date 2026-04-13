const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { validateFacilityId } = require('../middleware/validation');

const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.get('/:facilityId', validateFacilityId, inventoryController.getFacilityInventory);
router.post('/:facilityId/update', 
  protect, 
  authorize(ROLES.PHARMACIST, ROLES.ADMIN), 
  validateFacilityId, 
  inventoryController.updateStock
);

module.exports = router;
