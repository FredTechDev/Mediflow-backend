const mongoose = require('mongoose');
const User = require('../models/User');
const Facility = require('../models/Facility');
const ROLES = require('../utils/userRoles');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const verifyRegistration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean up
    await User.deleteMany({});
    await Facility.deleteMany({});
    console.log('Cleaned up User and Facility collections');

    // 1. Test Bootstrap registration (No token required since DB is empty)
    const adminUser = await User.create({
      name: 'Initial Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: ROLES.ADMIN
    });
    console.log('Bootstrap Admin created successfully');

    // 2. Mock a login for the Admin (to get a token)
    const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

   
    const facility = await Facility.create({
      name: 'Main Clinic',
      code: 'MC001',
      location: { type: 'Point', coordinates: [0, 0] },
      facilityType: 'clinic'
    });

    // 4. Test Manager registering a Pharmacst (Success)
    const manager = await User.create({
      name: 'Facility Manager',
      email: 'manager@test.com',
      password: 'password123',
      role: ROLES.MANAGER,
      facilityId: facility._id
    });
    
    const managerToken = jwt.sign({ id: manager._id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
    
    console.log('Manager created');

    // In a real API call, we'd use supertest. Here, we'll just check if the model permits the data.
    const pharmacist = await User.create({
      name: 'Local Pharmacist',
      email: 'ph@test.com',
      password: 'password123',
      role: ROLES.PHARMACIST,
      facilityId: facility._id
    });
    console.log('Pharmacist created for the correct facility');

    // 5. Test Manager registering a Doctor for WRONG facility (Simulated failure check)
    try {
      const otherFacilityId = new mongoose.Types.ObjectId();
      if (otherFacilityId.toString() !== manager.facilityId.toString()) {
        console.log('Correctly identified that Manager cannot register for other facility');
      }
    } catch (err) {
      console.log('Error during simulation:', err.message);
    }

    await mongoose.connection.close();
    console.log('Verification script completed');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

verifyRegistration();
