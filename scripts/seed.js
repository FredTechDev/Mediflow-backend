const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Facility = require('../models/Facility');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const PrescriptionItem = require('../models/PrescriptionItem');
const ROLES = require('../utils/userRoles');

dotenv.config();

const seedDemoData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚀 Connected to MongoDB for seeding...');

    // 1. CLEAR EXISTING DATA (Relevant to demo)
    await Facility.deleteMany({ code: 'KH-001' });
    await User.deleteMany({ email: { $in: ['doctor.achieng@mediflow.com', 'ph.otieno@mediflow.com'] } });
    await Patient.deleteMany({ patientIdentifier: { $in: ['P-998', 'P-999'] } });
    // Note: Inventory and Prescriptions are cleared below after facility creation
    console.log('🧹 Cleaned up old demo data.');

    // 2. CREATE FACILITY
    const facility = await Facility.create({
      name: 'Kakamega County Hospital',
      code: 'KH-001',
      location: { type: 'Point', coordinates: [34.7519, 0.2827] }, // Kakamega coordinates
      facilityType: 'hospital',
      address: { region: 'Western', district: 'Kakamega', ward: 'Township' }
    });
    console.log(`📍 Facility Created: ${facility.name}`);

    // Clear and Link Data to this specific facility
    await Inventory.deleteMany({ facilityId: facility._id });
    await Prescription.deleteMany({ facilityId: facility._id });
    await PrescriptionItem.deleteMany({}); // General clear for items

    // 3. CREATE USERS
    const doctor = await User.create({
      name: 'Dr. Achieng',
      email: 'doctor.achieng@mediflow.com',
      password: 'demo1234', // Will be hashed by model pre-save hook
      role: ROLES.DOCTOR,
      facilityId: facility._id
    });

    const pharmacist = await User.create({
      name: 'Pharmacist Otieno',
      email: 'ph.otieno@mediflow.com',
      password: 'demo1234',
      role: ROLES.PHARMACIST,
      facilityId: facility._id
    });
    console.log('👥 Users Created: Dr. Achieng & Ph. Otieno');

    // 4. CREATE PATIENTS
    const patient1 = await Patient.create({
      name: 'John Mwangi',
      patientIdentifier: 'P-998',
      age: 42,
      gender: 'male',
      registeredBy: doctor._id,
      facilityId: facility._id
    });

    const patient2 = await Patient.create({
      name: 'Mary Akinyi',
      patientIdentifier: 'P-999',
      age: 29,
      gender: 'female',
      registeredBy: doctor._id,
      facilityId: facility._id
    });
    console.log('🩹 Patients Registered: John Mwangi & Mary Akinyi');

    // 5. CREATE INVENTORY (Story-driven levels)
    const drugs = [
      { drugName: 'Amoxicillin', currentStock: 120, risk: 'none', category: 'antibiotics' },
      { drugName: 'Paracetamol', currentStock: 200, risk: 'none', category: 'painkiller' },
      { drugName: 'Artemether (Antimalarial)', currentStock: 30, risk: 'low', category: 'antimalarial' }, // Low (Malaria story)
      { drugName: 'Insulin', currentStock: 5, risk: 'critical', category: 'other' }, // Critical
      { drugName: 'Salbutamol', currentStock: 50, risk: 'medium', category: 'other' }
    ];

    const inventoryItems = await Inventory.insertMany(
      drugs.map(d => ({
        ...d,
        facilityId: facility._id,
        reorderPoint: 50,
        stockoutRisk: d.risk
      }))
    );
    console.log('💊 Inventory Seeded with realistic stock levels.');

    // 6. CREATE SAMPLE PRESCRIPTIONS
    // Prescription 1: Malaria Case (John Mwangi)
    const p1 = await Prescription.create({
      doctorId: doctor._id,
      facilityId: facility._id,
      patientId: patient1._id,
      status: 'pending',
      priority: 'normal',
      patientNotes: 'Presents with high fever and chills. Malaria suspected.'
    });

    // Link items
    const artemether = inventoryItems.find(i => i.drugName.includes('Artemether'));
    const paracetamol = inventoryItems.find(i => i.drugName === 'Paracetamol');

    await PrescriptionItem.insertMany([
      { prescriptionId: p1._id, inventoryId: artemether._id, drugName: artemether.drugName, quantity: 6 },
      { prescriptionId: p1._id, inventoryId: paracetamol._id, drugName: paracetamol.drugName, quantity: 10 }
    ]);

    // Prescription 2: Infection Case (Mary Akinyi)
    const p2 = await Prescription.create({
      doctorId: doctor._id,
      facilityId: facility._id,
      patientId: patient2._id,
      status: 'pending',
      priority: 'urgent',
      patientNotes: 'Severe cough and chest pain. Antibiotics required.'
    });

    const amoxicillin = inventoryItems.find(i => i.drugName === 'Amoxicillin');
    await PrescriptionItem.insertMany([
      { prescriptionId: p2._id, inventoryId: amoxicillin._id, drugName: amoxicillin.drugName, quantity: 10 }
    ]);

    console.log('🧾 Prescriptions Created (John: Malaria, Mary: Infection)');

    console.log('\n✨ DEMO DATA SEEDING COMPLETE! ✨');
    console.log('-----------------------------------');
    console.log(`Facility ID: ${facility._id}`);
    console.log(`Doctor Login: doctor.achieng@mediflow.com / demo1234`);
    console.log(`Pharmacist Login: ph.otieno@mediflow.com / demo1234`);
    console.log('-----------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedDemoData();
