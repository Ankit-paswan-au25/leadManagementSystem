/**
 * Seed Leads Script
 * Creates random sample leads for testing/development
 * 
 * Usage: node src/scripts/seedLeads.js [count]
 * Default count: 20
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const Schedule = require('../models/Schedule.model');
const { LEAD_STATUS, LEAD_SOURCE } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');
const { createDefaultSchedule } = require('../utils/scheduleHelper');
const config = require('../config/env');
const logger = require('../config/logger');

// Sample data for generating random leads
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Emily', 'Andrew', 'Kimberly', 'Paul', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const companies = [
  'Tech Solutions Inc', 'Global Enterprises', 'Digital Innovations', 'Future Systems',
  'Cloud Services Co', 'Data Analytics Ltd', 'Software Dynamics', 'Tech Ventures',
  'Innovation Labs', 'Smart Solutions', 'NextGen Technologies', 'Cyber Systems',
  'Digital Workspace', 'Enterprise Solutions', 'Tech Partners', 'Innovation Hub',
  'Cloud Dynamics', 'Data Systems Inc', 'Software Solutions', 'Tech Industries',
  'Modern Enterprises', 'Digital Platforms', 'Smart Tech Co', 'Future Innovations',
  'Advanced Systems', 'Tech Leaders', 'Digital Ventures', 'Innovation Partners'
];

const companySuffixes = ['Inc', 'LLC', 'Corp', 'Ltd', 'Co', 'Group', 'Partners', 'Solutions'];

// Generate random email
function generateEmail(firstName, lastName, companyName) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'business.com'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  
  const formats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomDomain}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@${randomDomain}`,
    `${firstName.toLowerCase()}${Math.floor(Math.random() * 100)}@${randomDomain}`,
    `${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@${randomDomain}`
  ];
  
  return formats[Math.floor(Math.random() * formats.length)];
}

// Generate random phone number
function generatePhone() {
  const areaCode = Math.floor(Math.random() * 800) + 200; // 200-999
  const exchange = Math.floor(Math.random() * 800) + 200; // 200-999
  const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `+1${areaCode}${exchange}${number}`;
}

// Generate random lead data
function generateLeadData(users) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const leadName = `${firstName} ${lastName}`;
  
  const companyName = companies[Math.floor(Math.random() * companies.length)];
  const email = generateEmail(firstName, lastName, companyName);
  const phone = Math.random() > 0.3 ? generatePhone() : undefined; // 70% have phone
  
  // Randomly assign to a user
  const owner = users[Math.floor(Math.random() * users.length)];
  
  // Random status (weighted towards NEW and CONTACTED)
  // Note: Using backend enum values (NEW, CONTACTED, FOLLOW_UP, REPLIED, CLOSED)
  const statusWeights = {
    [LEAD_STATUS.NEW]: 0.4,
    [LEAD_STATUS.CONTACTED]: 0.25,
    [LEAD_STATUS.FOLLOW_UP]: 0.2,
    [LEAD_STATUS.REPLIED]: 0.1,
    [LEAD_STATUS.CLOSED]: 0.05,
  };
  
  const random = Math.random();
  let status = LEAD_STATUS.NEW;
  let cumulative = 0;
  for (const [stat, weight] of Object.entries(statusWeights)) {
    cumulative += weight;
    if (random <= cumulative) {
      status = stat;
      break;
    }
  }
  
  // Random source
  const sources = Object.values(LEAD_SOURCE);
  const source = sources[Math.floor(Math.random() * sources.length)];
  
  return {
    leadName,
    companyName,
    email,
    phone,
    ownerId: owner._id,
    createdBy: owner._id,
    status,
    source,
  };
}

async function seedLeads(count = 20) {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await mongoose.connect(config.mongoUri);
    logger.info('Database connected successfully');

    // Get all active users
    const users = await User.find({ status: 'ACTIVE' });
    
    if (users.length === 0) {
      logger.error('No active users found. Please seed users first using: npm run seed:users');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    logger.info(`Found ${users.length} active user(s)`);

    // Clear existing leads if CLEAR_LEADS environment variable is set
    if (process.env.CLEAR_LEADS === 'true') {
      logger.info('Clearing existing leads...');
      await Lead.deleteMany({});
      await Schedule.deleteMany({});
      logger.info('Existing leads cleared');
    }

    // Generate and create leads
    const leadsToCreate = [];
    const createdLeads = [];
    
    logger.info(`Creating ${count} random leads...`);
    
    for (let i = 0; i < count; i++) {
      const leadData = generateLeadData(users);
      leadsToCreate.push(leadData);
    }
    
    // Create leads in batch
    for (const leadData of leadsToCreate) {
      try {
        // Check if lead with same email already exists
        const existingLead = await Lead.findOne({ email: leadData.email });
        
        if (existingLead) {
          logger.info(`Lead with email ${leadData.email} already exists. Skipping...`);
          continue;
        }
        
        // Create lead
        const lead = new Lead(leadData);
        const savedLead = await lead.save();
        createdLeads.push(savedLead);
        
        // Create LeadActivity for creation
        await createLeadActivity({
          leadId: savedLead._id,
          activityType: 'CREATED',
          performedBy: leadData.createdBy,
          ownerAtTime: leadData.ownerId,
          metadata: {
            source: savedLead.source,
          },
          description: `Lead created via seed script`,
        });
        
        // Auto-create default schedule for the lead
        const scheduleData = createDefaultSchedule(savedLead._id);
        const schedule = new Schedule(scheduleData);
        await schedule.save();
        
        logger.info(`✓ Created lead: ${savedLead.leadName} (${savedLead.status}) - ${savedLead.email}`);
      } catch (error) {
        logger.error(`Error creating lead ${leadData.leadName}:`, error.message);
      }
    }

    logger.info(`\n✓ Lead seeding completed successfully!`);
    logger.info(`Created ${createdLeads.length} leads out of ${count} requested`);
    
    // Display summary by status
    const statusCounts = {};
    createdLeads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    
    console.log('\n=== Lead Summary ===');
    console.log(`Total leads created: ${createdLeads.length}`);
    console.log('\nLeads by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Display summary by owner
    const ownerCounts = {};
    createdLeads.forEach(lead => {
      const ownerEmail = users.find(u => u._id.toString() === lead.ownerId.toString())?.email || 'Unknown';
      ownerCounts[ownerEmail] = (ownerCounts[ownerEmail] || 0) + 1;
    });
    
    console.log('\nLeads by owner:');
    Object.entries(ownerCounts).forEach(([owner, count]) => {
      console.log(`  ${owner}: ${count}`);
    });

    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding leads:', error);
    console.error('Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Get count from command line argument
const count = parseInt(process.argv[2]) || 20;

// Run seed function
seedLeads(count);

