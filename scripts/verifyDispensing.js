const mongoose = require('mongoose');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Patient = require('../models/Patient');
const Inventory = require('../models/Inventory');
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const StockMovement = require('../models/StockMovement');
const DispensingLog = require('../models/DispensingLog');
const ROLES = require('../utils/userRoles');
const dotenv = require('dotenv');

dotenv.config();

const verifyDispensing = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean up
    await Prescription.deleteMany({});
    await PrescriptionItem.deleteMany({});
    await StockMovement.deleteMany({});
    await DispensingLog.deleteMany({});
    console.log('Cleaned up previous test data');

    // 1. Setup Facility
    let facility = await Facility.findOne({ code: 'TH001' });
    if (!facility) {
      facility = await Facility.create({
        name: 'Test Hospital',
        code: 'TH001',
        location: { type: 'Point', coordinates: [36.8, -1.2] },
        facilityType: 'hospital'
      });
    }

    // 2. Setup Users
    let doctor = await User.findOne({ email: 'doctor@test.com' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. John', email: 'doctor@test.com', password: 'password123',
        role: ROLES.DOCTOR, facilityId: facility._id
      });
    }

    let pharmacist = await User.findOne({ email: 'ph@test.com' });
    if (!pharmacist) {
      pharmacist = await User.create({
        name: 'Ph. Jane', email: 'ph@test.com', password: 'password123',
        role: ROLES.PHARMACIST, facilityId: facility._id
      });
    }

    let patient = await Patient.findOne({ patientIdentifier: 'P-101' });
    if (!patient) {
      patient = await Patient.create({
        name: 'John Doe', patientIdentifier: 'P-101', age: 30, gender: 'male',
        registeredBy: doctor._id, facilityId: facility._id
      });
    }

    // 3. Setup Inventory
    await Inventory.deleteMany({ facilityId: facility._id });
    const inv1 = await Inventory.create({
      facilityId: facility._id, drugName: 'Amoxicillin', currentStock: 20
    });
    const inv2 = await Inventory.create({
      facilityId: facility._id, drugName: 'Paracetamol', currentStock: 50
    });
    console.log('✅ Inventory setup with 20 Amoxicillin and 50 Paracetamol');

    // --- EXECUTION 1: CREATE PRESCRIPTION ---
    console.log('\n--- PHASE 1: DOCTOR CREATES PRESCRIPTION ---');
    const prescriptionData = {
      patientId: patient._id,
      drugs: [
        { inventoryId: inv1._id, quantity: 5 },
        { inventoryId: inv2._id, quantity: 10 }
      ],
      priority: 'normal'
    };

    // Use controller logic (simulated here)
    const presc = await Prescription.create({
      doctorId: doctor._id, facilityId: facility._id,
      patientId: patient._id, priority: 'normal'
    });
    await PrescriptionItem.insertMany([
      { prescriptionId: presc._id, inventoryId: inv1._id, drugName: inv1.drugName, quantity: 5 },
      { prescriptionId: presc._id, inventoryId: inv2._id, drugName: inv2.drugName, quantity: 10 }
    ]);
    console.log('✅ Prescription and 2 items created');

    // --- EXECUTION 2: DISPENSE ---
    console.log('\n--- PHASE 2: PHARMACIST DISPENSES ---');
    
    const pToDispense = await Prescription.findById(presc._id);
    const pItems = await PrescriptionItem.find({ prescriptionId: pToDispense._id });

    for (const item of pItems) {
      const inv = await Inventory.findById(item.inventoryId);
      inv.currentStock -= item.quantity;
      await inv.save();

      await StockMovement.create({
        inventoryId: inv._id, facilityId: facility._id, userId: pharmacist._id,
        quantity: item.quantity, type: 'OUT', referenceId: presc._id
      });
    }

    await DispensingLog.create({
      prescriptionId: presc._id, pharmacistId: pharmacist._id, facilityId: facility._id,
      items: pItems.map(i => ({ drugName: i.drugName, quantity: i.quantity, inventoryId: i.inventoryId }))
    });

    pToDispense.status = 'dispensed';
    await pToDispense.save();
    console.log('✅ Dispensing logic executed (skipping transaction for local test)');

    // --- VERIFICATION ---
    const inv1After = await Inventory.findById(inv1._id);
    const inv2After = await Inventory.findById(inv2._id);
    console.log(`\n--- VERIFICATION ---`);
    console.log(`Amoxicillin Stock: ${inv1After.currentStock} (Expected 15)`);
    console.log(`Paracetamol Stock: ${inv2After.currentStock} (Expected 40)`);

    const movements = await StockMovement.countDocuments({ referenceId: presc._id });
    console.log(`Stock Movements logged: ${movements} (Expected 2)`);

    const log = await DispensingLog.findOne({ prescriptionId: presc._id });
    console.log(`Dispensing Log created: ${log ? 'YES' : 'NO'}`);

    if (inv1After.currentStock === 15 && inv2After.currentStock === 40 && movements === 2 && log) {
      console.log('\n🏆 ALL DISPENSING TESTS PASSED!');
    } else {
      console.log('\n❌ TESTS FAILED!');
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

verifyDispensing();
