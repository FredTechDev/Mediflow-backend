const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Facility = require('../models/Facility');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const DispensingLog = require('../models/DispensingLog');
const StockMovement = require('../models/StockMovement');
const Alert = require('../models/Alert');
const PredictionService = require('../services/predictionService');
const ROLES = require('../utils/userRoles');

dotenv.config();

// DETERMINISTIC IDs FOR DEMO STABILITY
const IDs = {
  FACILITY_KAKAMEGA: '65f000000000000000000001',
  FACILITY_MUMIAS: '65f000000000000000000002',
  
  USER_ADMIN: '65f000000000000000000010',
  USER_GOVT: '65f000000000000000000011',
  USER_SUPPLY: '65f000000000000000000012',
  USER_MANAGER: '65f000000000000000000013',
  USER_DOCTOR: '65f000000000000000000014',
  USER_PHARMAN: '65f000000000000000000015',

  PATIENT_JOHN: '65f000000000000000000020',
  PATIENT_MARY: '65f000000000000000000021',

  INV_AMOX_KAK: '65f000000000000000000030',
  INV_AMOX_MUM: '65f000000000000000000031',
  INV_ART_KAK: '65f000000000000000000032',
  INV_ART_MUM: '65f000000000000000000033'
};

const seedFullSystem = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚀 Connected to MongoDB for Full System Seed...');

    // 1. CLEANUP
    console.log('🧹 Purging Database...');
    await Promise.all([
      Facility.deleteMany({}),
      User.deleteMany({}),
      Inventory.deleteMany({}),
      Patient.deleteMany({}),
      Prescription.deleteMany({}),
      PrescriptionItem.deleteMany({}),
      DispensingLog.deleteMany({}),
      StockMovement.deleteMany({}),
      Alert.deleteMany({})
    ]);

    // 2. FACILITIES
    await Facility.insertMany([
      {
        _id: IDs.FACILITY_KAKAMEGA,
        name: 'Kakamega County Referral Hospital',
        code: 'KH-001',
        location: { type: 'Point', coordinates: [34.7519, 0.2827] },
        facilityType: 'hospital',
        address: { region: 'Western', district: 'Kakamega', ward: 'Township' }
      },
      {
        _id: IDs.FACILITY_MUMIAS,
        name: 'Mumias Level 4 Hospital',
        code: 'MH-002',
        location: { type: 'Point', coordinates: [34.4889, 0.3347] },
        facilityType: 'hospital',
        address: { region: 'Western', district: 'Mumias', ward: 'Central' }
      }
    ]);
    console.log('📍 Facilities Created');

    // 3. USERS (Using loop with .create to trigger password hashing middleware)
    const userData = [
      { _id: IDs.USER_ADMIN, name: 'Root Admin', email: 'admin@mediflow.com', password: 'password123', role: ROLES.ADMIN },
      { _id: IDs.USER_GOVT, name: 'MoH Officer', email: 'govt@mediflow.com', password: 'password123', role: ROLES.GOVERNMENT },
      { _id: IDs.USER_SUPPLY, name: 'Supply Chain Lead', email: 'supply@mediflow.com', password: 'password123', role: ROLES.SUPPLY_OFFICER },
      { _id: IDs.USER_MANAGER, name: 'Facility Manager', email: 'manager@mediflow.com', password: 'password123', role: ROLES.MANAGER, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.USER_DOCTOR, name: 'Dr. Achieng', email: 'doctor@mediflow.com', password: 'password123', role: ROLES.DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.USER_PHARMAN, name: 'Ph. Otieno', email: 'pharmacist@mediflow.com', password: 'password123', role: ROLES.PHARMACIST, facilityId: IDs.FACILITY_KAKAMEGA }
    ];

    for (const user of userData) {
      await User.create(user);
    }
    console.log('👥 Users Created (with secure hashing)');

    // 4. PATIENTS
    await Patient.insertMany([
      { _id: IDs.PATIENT_JOHN, name: 'John Mwangi', patientIdentifier: 'P-001', age: 45, gender: 'male', registeredBy: IDs.USER_DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.PATIENT_MARY, name: 'Mary Akinyi', patientIdentifier: 'P-002', age: 28, gender: 'female', registeredBy: IDs.USER_DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA }
    ]);
    console.log('🩹 Patients Created');

    // 5. INVENTORY
    const today = new Date();
    await Inventory.insertMany([
      {
        _id: IDs.INV_ART_KAK,
        facilityId: IDs.FACILITY_KAKAMEGA,
        drugName: 'Artemether (Antimalarial)',
        currentStock: 15,
        category: 'antimalarial',
        reorderPoint: 50,
        maxStock: 500,
        expiryDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000),
        consumptionHistory: [
            { date: new Date(today - 86400000), quantity: 15 },
            { date: new Date(today - 172800000), quantity: 15 }
        ]
      },
      {
        _id: IDs.INV_ART_MUM,
        facilityId: IDs.FACILITY_MUMIAS,
        drugName: 'Artemether (Antimalarial)',
        currentStock: 600,
        category: 'antimalarial',
        reorderPoint: 50,
        maxStock: 1000,
        expiryDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000)
      },
      {
        _id: IDs.INV_AMOX_KAK,
        facilityId: IDs.FACILITY_KAKAMEGA,
        drugName: 'Amoxicillin',
        currentStock: 300,
        category: 'antibiotics',
        reorderPoint: 50,
        maxStock: 1000,
        expiryDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        expiryStatus: 'expires_soon'
      },
      {
        _id: IDs.INV_AMOX_MUM,
        facilityId: IDs.FACILITY_MUMIAS,
        drugName: 'Amoxicillin',
        currentStock: 100,
        category: 'antibiotics',
        reorderPoint: 50,
        maxStock: 1000,
        expiryDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log('💊 Inventory Setup');

    // 6. INITIAL PREDICTION RUN
    console.log('Generating predictive context...');
    await PredictionService.updateAllPredictions();
    console.log('Automated Alerts Generated.');

    console.log('\n✨ FULL SYSTEM SEED COMPLETE! ✨');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedFullSystem();
