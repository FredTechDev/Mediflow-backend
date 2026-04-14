const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Facility = require('../models/Facility');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const Alert = require('../models/Alert');
const PredictionService = require('../services/predictionService');
const ROLES = require('../utils/userRoles');

dotenv.config();

// DETERMINISTIC IDs FOR NATIONAL SCALE SCENARIO
const IDs = {
  FACILITY_NAIROBI: '65f000000000000000000003',
  FACILITY_COAST: '65f000000000000000000004',
  FACILITY_KAKAMEGA: '65f000000000000000000001',
  FACILITY_MUMIAS: '65f000000000000000000002',
  
  USER_ADMIN: '65f000000000000000000010',
  USER_GOVT: '65f000000000000000000011',
  USER_DOCTOR: '65f000000000000000000014',
  USER_PHARMAN: '65f000000000000000000015',
  USER_COAST_PHARM: '65f000000000000000000016',

  PATIENT_JOHN: '65f000000000000000000020'
};

const seedNationalScenario = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚀 Connected to MongoDB: National Supply Chain Expansion Loading...');

    // 1. CLEANUP
    console.log('🧹 Clearing legacy clinical data...');
    await Promise.all([
      Facility.deleteMany({}),
      User.deleteMany({}),
      Inventory.deleteMany({}),
      Patient.deleteMany({}),
      Prescription.deleteMany({}),
      PrescriptionItem.deleteMany({}),
      Alert.deleteMany({})
    ]);

    // 2. NATIONAL FACILITIES (Cross-Regional)
    await Facility.insertMany([
      {
        _id: IDs.FACILITY_NAIROBI,
        name: 'National KEMSA Warehouse',
        code: 'NBO-WH-HQ',
        location: { type: 'Point', coordinates: [36.8219, -1.2921] }, // Nairobi
        facilityType: 'warehouse',
        address: { region: 'Nairobi', district: 'Westlands', ward: 'Parklands' }
      },
      {
        _id: IDs.FACILITY_COAST,
        name: 'Coast General Hospital',
        code: 'CGH-MOM',
        location: { type: 'Point', coordinates: [39.6646, -4.0435] }, // Mombasa
        facilityType: 'hospital',
        address: { region: 'Coast', district: 'Mombasa', ward: 'Old Town' }
      },
      {
        _id: IDs.FACILITY_KAKAMEGA,
        name: 'Kakamega General Hospital',
        code: 'KGH-WEST',
        location: { type: 'Point', coordinates: [34.7519, 0.2827] },
        facilityType: 'hospital',
        address: { region: 'Western', district: 'Kakamega', ward: 'Township' }
      }
    ]);

    // 3. REGIONAL USERS
    const userData = [
      { _id: IDs.USER_ADMIN, name: 'National Administrator', email: 'admin@mediflow.com', password: 'password123', role: ROLES.ADMIN },
      { _id: IDs.USER_GOVT, name: 'Ministry Executive', email: 'govt@mediflow.com', password: 'password123', role: ROLES.GOVERNMENT },
      { _id: IDs.USER_DOCTOR, name: 'Dr. Achieng', email: 'doctor@mediflow.com', password: 'password123', role: ROLES.DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.USER_PHARMAN, name: 'Ph. Otieno', email: 'pharmacist@mediflow.com', password: 'password123', role: ROLES.PHARMACIST, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.USER_COAST_PHARM, name: 'Ph. Hassan', email: 'coast@mediflow.com', password: 'password123', role: ROLES.PHARMACIST, facilityId: IDs.FACILITY_COAST }
    ];

    for (const u of userData) {
      await User.create(u);
    }
    console.log('👤 National User Registry Synced.');

    // 4. DIVERSIFIED NATIONAL INVENTORY
    const today = new Date();
    const future = (days) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    await Inventory.insertMany([
      // WAREHOUSE (High Stock Reservoir)
      {
        facilityId: IDs.FACILITY_NAIROBI,
        drugName: 'Dolutegravir (ARV)',
        currentStock: 25000,
        category: 'arv',
        reorderPoint: 5000,
        maxStock: 50000,
        expiryDate: future(365)
      },
      {
        facilityId: IDs.FACILITY_NAIROBI,
        drugName: 'BCG Vaccine',
        currentStock: 1500,
        category: 'vaccine',
        reorderPoint: 500,
        maxStock: 3000,
        expiryDate: future(45) // Warning state soon
      },
      // KAKAMEGA (Active Clinical Surge)
      {
        facilityId: IDs.FACILITY_KAKAMEGA,
        drugName: 'Artemether (AL)',
        currentStock: 12, // Critical Shortage
        category: 'antimalarial',
        reorderPoint: 100,
        consumptionHistory: [
          { date: future(-1), quantity: 50 },
          { date: future(-2), quantity: 60 }
        ]
      },
      {
        facilityId: IDs.FACILITY_KAKAMEGA,
        drugName: 'BCG Vaccine',
        currentStock: 5, // Near stockout
        category: 'vaccine',
        reorderPoint: 50
      },
      // COAST (Stabilized Hospital)
      {
        facilityId: IDs.FACILITY_COAST,
        drugName: 'Amoxicillin 500mg',
        currentStock: 2200,
        category: 'antibiotics',
        reorderPoint: 500,
        maxStock: 5000
      },
      {
        facilityId: IDs.FACILITY_COAST,
        drugName: 'N95 Respirators (PPE)',
        currentStock: 4500,
        category: 'other',
        reorderPoint: 1000,
        maxStock: 10000
      }
    ]);
    console.log('💊 National Health Ledger Initialized (Vaccines, ARVs, PPE, Antimalarials).');

    // 5. GLOBAL PREDICTION RE-SCAN
    console.log('⏳ Running national supply risk analysis...');
    await PredictionService.updateAllPredictions();
    console.log('✅ Supply Chain Intelligence: Alerts Raised.');

    console.log('\n🌎 NATIONAL SCALE SEED COMPLETE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ National scale setup failed:', err);
    process.exit(1);
  }
};

seedNationalScenario();
