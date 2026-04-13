const express = require('express');
const router = express.Router();
const {
  registerPatient,
  getPatients,
  getPatientById
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.use(protect);

router.post('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), registerPatient);
router.get('/', authorize(ROLES.DOCTOR, ROLES.ADMIN, ROLES.PHARMACIST), getPatients);
router.get('/:id', authorize(ROLES.DOCTOR, ROLES.ADMIN, ROLES.PHARMACIST), getPatientById);

module.exports = router;
