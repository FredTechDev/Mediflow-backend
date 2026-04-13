const express = require('express');
const router = express.Router();
const {
  createPrescription,
  getMyPrescriptions
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.use(protect);

router.post('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), createPrescription);
router.get('/my', authorize(ROLES.DOCTOR, ROLES.ADMIN), getMyPrescriptions);

module.exports = router;
