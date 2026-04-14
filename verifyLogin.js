const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const verifyLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Atlas for Login Verification');

    const testUser = {
      email: 'doctor@mediflow.com',
      password: 'password123',
      role: 'doctor'
    };

    console.log(`🔍 Testing Login for: ${testUser.email} as ${testUser.role}...`);

    const user = await User.findOne({ email: testUser.email }).select('+password');

    if (!user) {
      console.error('❌ FAIL: User not found in database.');
      process.exit(1);
    }

    console.log('✅ User record located.');
    console.log(`👤 Role in DB: ${user.role}`);

    const isMatch = await user.matchPassword(testUser.password);

    if (isMatch) {
      console.log('✨ SUCCESS: Password hash matches "password123"!');
      console.log('🚀 You can now login on the frontend using these credentials.');
    } else {
      console.error('❌ FAIL: Password does NOT match. Hashing context might be mismatched.');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Diagnostic Error:', err);
    process.exit(1);
  }
};

verifyLogin();
