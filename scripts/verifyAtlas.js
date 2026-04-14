const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const verifyAtlas = async () => {
  console.log('🔍 Mediflow Connection Diagnostic: Analyzing MongoDB Atlas Configuration...');
  console.log('-------------------------------------------------------------------------');

  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.startsWith('mongodb+srv://')) {
    console.error('❌ CONFIG ERROR: MONGODB_URI is either missing or not a valid Atlas srv string.');
    process.exit(1);
  }

  try {
    console.log('⏳ Attempting handshake with Atlas cluster...');
    
    const startTime = Date.now();
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    const duration = Date.now() - startTime;

    const { host, name, port } = conn.connection;

    console.log('✅ CONNECTION SUCCESSFUL!');
    console.log(`📍 Host Instance: ${host}`);
    console.log(`💽 Target Database: ${name}`);
    console.log(`⏱️ Latency: ${duration}ms`);
    console.log('-------------------------------------------------------------------------');
    console.log('🚀 Mediflow is ready for Atlas operations.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.log('-------------------------------------------------------------------------');
    console.error('❌ CONNECTION FAILED');
    console.error(`Error Code: ${err.code || 'N/A'}`);
    console.error(`Message: ${err.message}`);
    console.log('\nTroubleshooting Tips:');
    console.log('1. Ensure your IP address is whitelisted in Atlas Dashboard -> Network Access.');
    console.log('2. Verify that the username and password in .env are correct.');
    console.log('3. Check that your network allows outgoing traffic on port 27017/27015/27016.');
    console.log('-------------------------------------------------------------------------');
    process.exit(1);
  }
};

verifyAtlas();
