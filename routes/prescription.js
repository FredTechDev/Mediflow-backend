const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.use(protect);

// Doctor
router.post('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), prescriptionController.createPrescription);
router.get('/my', authorize(ROLES.DOCTOR), prescriptionController.getMyPrescriptions);

// Shared/Pharmacist
router.get('/', authorize(ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.ADMIN), prescriptionController.getPrescriptions);
router.get('/:id', authorize(ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.ADMIN), prescriptionController.getPrescriptionById);
router.post('/dispense', authorize(ROLES.PHARMACIST, ROLES.ADMIN), prescriptionController.dispensePrescription);

module.exports = router;
