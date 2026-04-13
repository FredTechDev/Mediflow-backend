const mongoose = require('mongoose');
const User = require('../models/User');
const ROLES = require('../utils/userRoles');
const dotenv = require('dotenv');

dotenv.config();

const testRBAC = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean up existing test users
    await User.deleteMany({ email: { $regex: /test/ } });
    console.log('Cleaned up test users');

    // 1. Test Pharmacist registration (Requires facilityId)
    try {
      await User.create({
        name: 'Test Pharmacist',
        email: 'pharmacist@test.com',
        password: 'password123',
        role: ROLES.PHARMACIST
        // missing facilityId
      });
    } catch (err) {
      console.log('✅ Correctly blocked Pharmacist without facilityId');
    }

    // 2. Test Government registration (Does NOT require facilityId)
    const govUser = await User.create({
      name: 'Test Government',
      email: 'gov@test.com',
      password: 'password123',
      role: ROLES.GOVERNMENT
    });
    console.log('✅ Successfully created Government user without facilityId');

    // 3. Test Password Hashing
    const user = await User.findOne({ email: 'gov@test.com' }).select('+password');
    if (user.password !== 'password123' && user.password.startsWith('$2a$')) {
      console.log('✅ Password correctly hashed');
    }

    // 4. Test Password Matching
    const isMatch = await govUser.matchPassword('password123');
    if (isMatch) {
      console.log('✅ Password matching works');
    }

    await mongoose.connection.close();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

testRBAC();
