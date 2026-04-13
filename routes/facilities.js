const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.get('/', facilityController.getAllFacilities);
router.get('/:id', facilityController.getFacilityById);

// Admin only: Register new facility
router.post('/', protect, authorize(ROLES.ADMIN), facilityController.createFacility);

module.exports = router;
