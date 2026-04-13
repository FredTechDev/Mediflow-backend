const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { validateFacilityId } = require('../middleware/validation');

router.get('/:facilityId', validateFacilityId, inventoryController.getFacilityInventory);
router.post('/:facilityId/update', validateFacilityId, inventoryController.updateStock);

module.exports = router;
