const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const PredictionService = require('../services/predictionService');
const Facility = require('../models/Facility');
const dotenv = require('dotenv');

dotenv.config();

const verifyPredictions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚀 Connected to MongoDB for verification...');

    // 1. Setup Data
    let facility = await Facility.findOne({ code: 'PRED-TEST' });
    if (!facility) {
      facility = await Facility.create({
        name: 'Prediction Test Clinic',
        code: 'PRED-TEST',
        location: { type: 'Point', coordinates: [0, 0] },
        facilityType: 'clinic'
      });
    }

    await Inventory.deleteMany({ facilityId: facility._id });

    const today = new Date();
    
    // Drug A: Critical Stockout (10 stock, 5/day usage = 2 days left)
    const drugA = await Inventory.create({
        facilityId: facility._id,
        drugName: 'Critical Shortage Heroin',
        currentStock: 10,
        consumptionHistory: [
            { date: today, quantity: 5 },
            { date: new Date(today - 86400000), quantity: 5 }
        ]
    });

    // Drug B: Expiring Soon (large stock, but expires in 5 days)
    const drugB = await Inventory.create({
        facilityId: facility._id,
        drugName: 'Expires Soon Aspirin',
        currentStock: 1000,
        expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        batchNumber: 'BATCH-001'
    });

    // Drug C: Already Expired
    const drugC = await Inventory.create({
        facilityId: facility._id,
        drugName: 'Expired Medicine',
        currentStock: 100,
        expiryDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
        batchNumber: 'EXPIRED-666'
    });

    console.log('✅ Test items created. Running updateAllPredictions...');

    // 2. Run Prediction Engine
    await PredictionService.updateAllPredictions();

    // 3. Verify Results
    const aResult = await Inventory.findById(drugA._id);
    const bResult = await Inventory.findById(drugB._id);
    const cResult = await Inventory.findById(drugC._id);

    console.log('\n--- VERIFICATION RESULTS ---');
    console.log(`${aResult.drugName}: StockRisk: ${aResult.stockoutRisk} (Expected: critical), Days: ${aResult.daysOfStockLeft}`);
    console.log(`${bResult.drugName}: ExpiryStatus: ${bResult.expiryStatus} (Expected: expires_soon)`);
    console.log(`${cResult.drugName}: ExpiryStatus: ${cResult.expiryStatus} (Expected: expired)`);

    const summary = await PredictionService.getDashboardSummary();
    console.log('\n--- DASHBOARD SUMMARY ---');
    console.log(`Critical Stockouts: ${summary.summary.criticalStockouts}`);
    console.log(`Expiry Risks: ${summary.summary.expiryRisks}`);

    if (aResult.stockoutRisk === 'critical' && bResult.expiryStatus === 'expires_soon' && cResult.expiryStatus === 'expired') {
        console.log('\n🏆 ALL PREDICTION TESTS PASSED!');
    } else {
        console.log('\n❌ TESTS FAILED!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
};

verifyPredictions();
