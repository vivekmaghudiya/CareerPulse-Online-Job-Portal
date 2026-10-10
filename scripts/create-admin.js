require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { sanitizeMongoUri, maskMongoUri } = require('../config/db');

async function createAdmin() {
  try {
    const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jobportal';
    const connUri = sanitizeMongoUri(rawUri);

    console.log(`Connecting to database: ${maskMongoUri(connUri)}...`);
    await mongoose.connect(connUri, { serverSelectionTimeoutMS: 8000 });

    // Check if an admin account already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('\n------------------------------------------------------------');
      console.log('✅ An Administrator account already exists in MongoDB:');
      console.log(`   Name:  ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role:  ${existingAdmin.role}`);
      console.log(`   ID:    ${existingAdmin._id}`);
      console.log('------------------------------------------------------------\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Read admin settings from environment variables securely
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    if (!adminEmail || !adminPassword) {
      console.error('\n❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in your .env file.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.error(`\n⚠️  A user with email ${adminEmail} already exists with role: "${existingUser.role}".`);
      console.error('   To prevent unintended privilege escalation, ordinary user roles are not modified automatically.');
      console.error('   Please provide a different ADMIN_EMAIL in your .env file or update the role directly.');
      await mongoose.disconnect();
      process.exit(1);
    }

    const newAdmin = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // will be hashed by pre-save hook
      role: 'admin',
      bio: 'Platform administrator with system privileges.'
    });

    await newAdmin.save();

    console.log('\n============================================================');
    console.log('🎉 Administrator account created successfully!');
    console.log(`   Name:  ${newAdmin.name}`);
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Role:  ${newAdmin.role}`);
    console.log('============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
