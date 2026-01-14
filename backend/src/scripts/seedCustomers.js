/**
 * Seed Customers Script
 * Creates sample customers (banks and financial institutions)
 * 
 * Usage: node src/scripts/seedCustomers.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const Customer = require('../models/Customer.model');
const Lead = require('../models/Lead.model');
const { LEAD_STATUS } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');
const config = require('../config/env');
const logger = require('../config/logger');

const customersToSeed = [
  {
    customerName: 'ICICI Bank',
    companyName: 'ICICI Bank Limited',
    primaryEmail: 'contact@icicibank.com',
    phone: '+91-22-26531414',
  },
  {
    customerName: 'Bandhan Bank',
    companyName: 'Bandhan Bank Limited',
    primaryEmail: 'info@bandhanbank.com',
    phone: '+91-33-40108000',
  },
  {
    customerName: 'Reserve Bank of India',
    companyName: 'Reserve Bank of India (RBI)',
    primaryEmail: 'contact@rbi.org.in',
    phone: '+91-22-22612000',
  },
  {
    customerName: 'State Bank of India',
    companyName: 'State Bank of India',
    primaryEmail: 'contact@sbi.co.in',
    phone: '+91-22-22781383',
  },
  {
    customerName: 'HDFC Bank',
    companyName: 'HDFC Bank Limited',
    primaryEmail: 'contact@hdfcbank.com',
    phone: '+91-22-66521000',
  },
  {
    customerName: 'Axis Bank',
    companyName: 'Axis Bank Limited',
    primaryEmail: 'contact@axisbank.com',
    phone: '+91-22-24251000',
  },
  {
    customerName: 'Kotak Mahindra Bank',
    companyName: 'Kotak Mahindra Bank Limited',
    primaryEmail: 'contact@kotak.com',
    phone: '+91-22-66558100',
  },
  {
    customerName: 'Punjab National Bank',
    companyName: 'Punjab National Bank',
    primaryEmail: 'contact@pnb.co.in',
    phone: '+91-11-23718274',
  },
];

async function seedCustomers() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await mongoose.connect(config.mongoUri);
    logger.info('Database connected successfully');

    // Get all active users
    const User = require('../models/User.model');
    const users = await User.find({ status: 'ACTIVE' });
    
    if (users.length === 0) {
      logger.error('No active users found. Please seed users first using: npm run seed:users');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    logger.info(`Found ${users.length} active user(s)`);

    // Clear existing customers if CLEAR_CUSTOMERS environment variable is set
    if (process.env.CLEAR_CUSTOMERS === 'true') {
      logger.info('Clearing existing customers and related leads...');
      await Customer.deleteMany({});
      // Note: We won't delete leads, just update their status back to CLOSED if needed
      logger.info('Existing customers cleared');
    }

    const createdCustomers = [];
    const skippedCustomers = [];

    for (const customerData of customersToSeed) {
      try {
        // Check if customer already exists by email
        const existingCustomer = await Customer.findOne({ primaryEmail: customerData.primaryEmail });
        
        if (existingCustomer) {
          logger.info(`Customer with email ${customerData.primaryEmail} already exists. Skipping...`);
          skippedCustomers.push(customerData.customerName);
          continue;
        }

        // Randomly assign to a user
        const owner = users[Math.floor(Math.random() * users.length)];

        // Create a closed lead first (customers must come from leads)
        const lead = new Lead({
          leadName: customerData.customerName,
          companyName: customerData.companyName,
          email: customerData.primaryEmail,
          phone: customerData.phone,
          ownerId: owner._id,
          createdBy: owner._id,
          status: LEAD_STATUS.CLOSED,
          source: 'MANUAL',
        });

        const savedLead = await lead.save();

        // Create LeadActivity for the lead
        await createLeadActivity({
          leadId: savedLead._id,
          activityType: 'CREATED',
          performedBy: owner._id,
          ownerAtTime: owner._id,
          metadata: {
            source: 'MANUAL',
          },
          description: `Lead created via customer seed script`,
        });

        // Create customer from the lead
        const customer = new Customer({
          customerName: customerData.customerName,
          companyName: customerData.companyName,
          primaryEmail: customerData.primaryEmail,
          phone: customerData.phone,
          convertedFromLeadId: savedLead._id,
          accountOwnerId: owner._id,
          status: 'ACTIVE',
        });

        await customer.save();

        // Create LeadActivity for customer conversion
        await createLeadActivity({
          leadId: savedLead._id,
          activityType: 'CUSTOMER_CREATED',
          performedBy: owner._id,
          ownerAtTime: owner._id,
          metadata: {
            customerId: customer._id.toString(),
            customerName: customer.customerName,
          },
          description: `Lead converted to customer: ${customer.customerName}`,
        });

        createdCustomers.push(customer);
        logger.info(`✓ Created customer: ${customer.customerName} (${customer.primaryEmail})`);
      } catch (error) {
        logger.error(`Error creating customer ${customerData.customerName}:`, error.message);
      }
    }

    logger.info(`\n✓ Customer seeding completed successfully!`);
    logger.info(`Created ${createdCustomers.length} customers`);
    if (skippedCustomers.length > 0) {
      logger.info(`Skipped ${skippedCustomers.length} existing customers`);
    }
    
    // Display summary
    console.log('\n=== Seeded Customers ===');
    customersToSeed.forEach((customer) => {
      const status = skippedCustomers.includes(customer.customerName) ? '(Already exists)' : '✓ Created';
      console.log(`${status} - ${customer.customerName}`);
      console.log(`  Company: ${customer.companyName}`);
      console.log(`  Email: ${customer.primaryEmail}`);
      console.log('---');
    });

    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding customers:', error);
    console.error('Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run seed function
seedCustomers();

