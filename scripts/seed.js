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
    await Promise.all([
      Facility.deleteMany({}),
      User.deleteMany({}),
      Inventory.deleteMany({}),
      Patient.deleteMany({}),
      Prescription.deleteMany({}),
      PrescriptionItem.deleteMany({}),
      DispensingLog.deleteMany({}),
      StockMovement.deleteMany({})
    ]);
    console.log('🧹 Database Purged.');

    // 2. FACILITIES (Geospatially close: Kakamega & Mumias ~30km)
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
    console.log('📍 Facilities Created (Kakamega & Mumias)');

    // 3. USERS (Full RBAC Coverage)
    await User.insertMany([
      { _id: IDs.USER_ADMIN, name: 'Root Admin', email: 'admin@mediflow.com', password: 'password123', role: ROLES.ADMIN },
      { _id: IDs.USER_GOVT, name: 'MoH Officer', email: 'govt@mediflow.com', password: 'password123', role: ROLES.GOVERNMENT },
      { _id: IDs.USER_SUPPLY, name: 'Supply Chain Lead', email: 'supply@mediflow.com', password: 'password123', role: ROLES.SUPPLY_OFFICER },
      { _id: IDs.USER_MANAGER, name: 'Facility Manager', email: 'manager@mediflow.com', password: 'password123', role: ROLES.MANAGER, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.USER_DOCTOR, name: 'Dr. Achieng', email: 'doctor@mediflow.com', password: 'password123', role: ROLES.DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.USER_PHARMAN, name: 'Ph. Otieno', email: 'pharmacist@mediflow.com', password: 'password123', role: ROLES.PHARMACIST, facilityId: IDs.FACILITY_KAKAMEGA }
    ]);
    console.log('👥 Users Created (All 6 Roles)');

    // 4. PATIENTS
    await Patient.insertMany([
      { _id: IDs.PATIENT_JOHN, name: 'John Mwangi', patientIdentifier: 'P-001', age: 45, gender: 'male', registeredBy: IDs.USER_DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA },
      { _id: IDs.PATIENT_MARY, name: 'Mary Akinyi', patientIdentifier: 'P-002', age: 28, gender: 'female', registeredBy: IDs.USER_DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA }
    ]);
    console.log('🩹 Patients Created');

    // 5. INVENTORY (The "Match" Scenario & Expiry Demo)
    const today = new Date();
    await Inventory.insertMany([
      // ARTEMETHER: KH (Shortage) vs MH (Surplus)
      {
        _id: IDs.INV_ART_KAK,
        facilityId: IDs.FACILITY_KAKAMEGA,
        drugName: 'Artemether (Antimalarial)',
        currentStock: 10, // CRITICAL
        category: 'antimalarial',
        stockoutRisk: 'critical',
        reorderPoint: 50,
        expiryDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000)
      },
      {
        _id: IDs.INV_ART_MUM,
        facilityId: IDs.FACILITY_MUMIAS,
        drugName: 'Artemether (Antimalarial)',
        currentStock: 500, // SURPLUS
        category: 'antimalarial',
        stockoutRisk: 'none',
        reorderPoint: 50,
        expiryDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000)
      },
      // AMOXICILLIN: Balanced but expiring soon in KAK
      {
        _id: IDs.INV_AMOX_KAK,
        facilityId: IDs.FACILITY_KAKAMEGA,
        drugName: 'Amoxicillin',
        currentStock: 100,
        category: 'antibiotics',
        expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // EXPIRES SOON
        expiryStatus: 'expires_soon'
      },
      {
        _id: IDs.INV_AMOX_MUM,
        facilityId: IDs.FACILITY_MUMIAS,
        drugName: 'Amoxicillin',
        currentStock: 100,
        category: 'antibiotics',
        expiryDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log('💊 Inventory Setup (Shortage/Surplus & Expiry scenarios ready)');

    // 6. PRESCRIPTIONS
    const p1 = await Prescription.create({
      doctorId: IDs.USER_DOCTOR, facilityId: IDs.FACILITY_KAKAMEGA, patientId: IDs.PATIENT_JOHN,
      status: 'pending', priority: 'normal'
    });
    await PrescriptionItem.create({
      prescriptionId: p1._id, inventoryId: IDs.INV_ART_KAK, drugName: 'Artemether (Antimalarial)', quantity: 6
    });

    console.log('🧾 Sample Pending Prescription Created (to be dispensed)');

    console.log('\n✨ FULL SYSTEM SEED COMPLETE! ✨');
    console.log('-----------------------------------');
    console.log(`Kakamega Facility: ${IDs.FACILITY_KAKAMEGA}`);
    console.log(`Mumias Facility:   ${IDs.FACILITY_MUMIAS}`);
    console.log(`Admin Login:       admin@mediflow.com / password123`);
    console.log(`Doctor Login:      doctor@mediflow.com / password123`);
    console.log(`Pharmacist Login:  pharmacist@mediflow.com / password123`);
    console.log('-----------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedFullSystem();
