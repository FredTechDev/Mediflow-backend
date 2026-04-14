const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const PredictionService = require('../services/predictionService');
const Facility = require('../models/Facility');
const Alert = require('../models/Alert');
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
    await Alert.deleteMany({ facilityId: facility._id });

    const today = new Date();
    
    // Drug A: High Usage (Current: 150, ReorderPoint: 100, Usage: 10/day)
    // Days until reorder = (150-100)/10 = 5 days
    // daysLeft = 150/10 = 15 days (Medium risk)
    const drugA = await Inventory.create({
        facilityId: facility._id,
        drugName: 'Logistics Test Drug',
        currentStock: 150,
        reorderPoint: 100,
        maxStock: 500,
        consumptionHistory: [
            { date: today, quantity: 10 },
            { date: new Date(today - 86400000), quantity: 10 }
        ]
    });

    console.log('Test item created. Running updateAllPredictions...');

    // 2. Run Prediction Engine
    await PredictionService.updateAllPredictions();

    // 3. Verify Alert Generation
    // We expect an alert if the risk is 'high' or 'critical'. 
    // In our test, daysLeft=15 is 'medium' in the new logic. 
    // Let's force it to 'high' by reducing stock to 50.
    
    await Inventory.findByIdAndUpdate(drugA._id, { currentStock: 50 }); // Below reorder point (100)
    await PredictionService.updateAllPredictions();

    const alert = await Alert.findOne({ inventoryId: drugA._id, type: 'stockout_risk' });

    console.log('\n--- VERIFICATION RESULTS ---');
    if (alert) {
        console.log(`Alert Title: ${alert.title}`);
        console.log(`Alert Description: ${alert.description}`);
        console.log(`Metadata Reorder Amount: ${alert.metadata.reorderAmount}`);
        console.log(`Metadata Reorder Date: ${alert.metadata.reorderDate}`);

        const expectedAmount = 500 - 50; // max - current
        if (alert.metadata.reorderAmount === expectedAmount) {
            console.log('✅ Reorder Amount Prediction: PASSED');
        } else {
            console.log(`❌ Reorder Amount Prediction: FAILED (Got ${alert.metadata.reorderAmount}, expected ${expectedAmount})`);
        }

        if (alert.metadata.reorderDate) {
            console.log('✅ Reorder Date Prediction: PASSED');
        } else {
            console.log('❌ Reorder Date Prediction: FAILED (Missing)');
        }

        if (alert.description.includes('Reorder') && alert.description.includes('units')) {
            console.log('✅ Description Formatting: PASSED');
        } else {
            console.log('❌ Description Formatting: FAILED');
        }
    } else {
        console.log('❌ Alert Generation: FAILED (No alert found)');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
};

verifyPredictions();
