/**
 * Seed Users Script
 * Creates default admin and user accounts for testing/development
 * 
 * Usage: node src/scripts/seedUsers.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const User = require('../models/User.model');
const config = require('../config/env');
const logger = require('../config/logger');

const usersToSeed = [
  {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    name: 'Regular User',
    email: 'user@test.com',
    password: 'User123!',
    role: 'USER',
    status: 'ACTIVE',
  },
];

async function seedUsers() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await mongoose.connect(config.mongoUri);
    logger.info('Database connected successfully');

    // Seed users
    for (const userData of usersToSeed) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        logger.info(`User ${userData.email} already exists. Skipping...`);
        
        // Update password if needed (useful for resetting passwords)
        if (process.env.RESET_PASSWORDS === 'true') {
          existingUser.passwordHash = userData.password; // Will be hashed by pre-save hook
          existingUser.role = userData.role;
          existingUser.status = userData.status;
          await existingUser.save();
          logger.info(`Updated user ${userData.email}`);
        }
      } else {
        // Create new user
        const user = new User({
          name: userData.name,
          email: userData.email,
          passwordHash: userData.password, // Will be hashed by pre-save hook
          role: userData.role,
          status: userData.status,
        });
        
        await user.save();
        logger.info(`✓ Created user: ${userData.email} (${userData.role})`);
      }
    }

    logger.info('User seeding completed successfully!');
    
    // Display created users
    console.log('\n=== Seeded Users ===');
    for (const userData of usersToSeed) {
      console.log(`Email: ${userData.email}`);
      console.log(`Password: ${userData.password}`);
      console.log(`Role: ${userData.role}`);
      console.log(`Status: ${userData.status}`);
      console.log('---');
    }

    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding users:', error);
    console.error('Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run seed function
seedUsers();

