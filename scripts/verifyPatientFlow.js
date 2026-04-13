const mongoose = require('mongoose');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Inventory = require('../models/Inventory');
const ROLES = require('../utils/userRoles');
const dotenv = require('dotenv');

dotenv.config();

const verifyPatientFlow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean up
    await Patient.deleteMany({ patientIdentifier: 'P-101' });
    await Prescription.deleteMany({});
    console.log('Cleaned up test data');

    // 1. Setup Facility and Doctor
    let facility = await Facility.findOne({ code: 'TH001' });
    if (!facility) {
      facility = await Facility.create({
        name: 'Test Hospital',
        code: 'TH001',
        location: { type: 'Point', coordinates: [36.8, -1.2] },
        facilityType: 'hospital'
      });
    }

    let doctor = await User.findOne({ email: 'doctor@test.com' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Test',
        email: 'doctor@test.com',
        password: 'password123',
        role: ROLES.DOCTOR,
        facilityId: facility._id
      });
    }

    // 2. Test Patient Registration
    const patient = await Patient.create({
      name: 'John Doe',
      patientIdentifier: 'P-101',
      age: 35,
      gender: 'male',
      registeredBy: doctor._id,
      facilityId: facility._id
    });
    console.log('✅ Patient registered successfully');

    // 3. Test duplicate registration (Should fail)
    try {
      await Patient.create({
        name: 'Duplicate Jane',
        patientIdentifier: 'P-101',
        age: 28,
        gender: 'female',
        registeredBy: doctor._id,
        facilityId: facility._id
      });
      console.log('❌ Failed: Allowed duplicate identifier');
    } catch (err) {
      console.log('✅ Correctly blocked duplicate patient identifier');
    }

    // 4. Test Prescription Linking
    const inventory = await Inventory.findOne({ facilityId: facility._id }) || await Inventory.create({
      facilityId: facility._id,
      drugName: 'Amoxicillin',
      currentStock: 100
    });

    const prescription = await Prescription.create({
      doctorId: doctor._id,
      facilityId: facility._id,
      patientId: patient._id,
      inventoryId: inventory._id,
      drugName: inventory.drugName,
      quantity: 10
    });
    console.log('✅ Prescription linked to Patient successfully');

    // 5. Verify Patient History (Virtual populate)
    const patientWithHistory = await Patient.findById(patient._id).populate('prescriptions');
    if (patientWithHistory.prescriptions.length > 0) {
      console.log('✅ Patient medical history correctly populated');
    }

    await mongoose.connection.close();
    console.log('Verification script completed');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

verifyPatientFlow();
