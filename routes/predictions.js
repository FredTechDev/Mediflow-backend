const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { validateFacilityId } = require('../middleware/validation');

router.get('/facility/:facilityId', validateFacilityId, predictionController.getFacilityPredictions);
router.get('/critical', predictionController.getAllCriticalStockouts);
router.get('/dashboard', predictionController.getDashboardSummary);
router.post('/update', predictionController.triggerPredictionUpdate);
router.get('/history/:facilityId/:drugName', validateFacilityId, predictionController.getDrugPredictionHistory);

module.exports = router;
