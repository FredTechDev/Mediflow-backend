const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../utils/userRoles');

router.use(protect);

// Doctor
router.post('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), prescriptionController.createPrescription);

// IMPORTANT: Static routes (/my, /dispense) must come BEFORE the /:id param route
// to prevent Express from treating "my" or "dispense" as an ID
router.get('/my', authorize(ROLES.DOCTOR), prescriptionController.getMyPrescriptions);
router.post('/dispense', authorize(ROLES.PHARMACIST, ROLES.ADMIN), prescriptionController.dispensePrescription);

// Shared/Pharmacist
router.get('/', authorize(ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.ADMIN), prescriptionController.getPrescriptions);
router.get('/:id', authorize(ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.ADMIN), prescriptionController.getPrescriptionById);

module.exports = router;
