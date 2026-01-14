/**
 * Seed Ownership Requests Script
 * Creates sample ownership change requests (pending)
 * 
 * Usage: node src/scripts/seedOwnershipRequests.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const Lead = require('../models/Lead.model');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const config = require('../config/env');
const logger = require('../config/logger');

async function seedOwnershipRequests() {
    try {
        // Connect to database
        logger.info('Connecting to database...');
        await mongoose.connect(config.mongoUri);
        logger.info('Database connected successfully');

        // Get all active users (need at least 2 for ownership requests)
        const users = await User.find({ status: 'ACTIVE' });

        if (users.length < 2) {
            logger.error('Need at least 2 active users to create ownership requests.');
            await mongoose.connection.close();
            process.exit(1);
        }

        logger.info(`Found ${users.length} active user(s)`);

        // Get leads
        const leads = await Lead.find().limit(30);

        if (leads.length === 0) {
            logger.error('No leads found. Please seed leads first.');
            await mongoose.connection.close();
            process.exit(1);
        }

        logger.info(`Found ${leads.length} lead(s)`);

        // Clear existing ownership requests if CLEAR_OWNERSHIP_REQUESTS environment variable is set
        if (process.env.CLEAR_OWNERSHIP_REQUESTS === 'true') {
            logger.info('Clearing existing ownership requests...');
            await LeadActivity.deleteMany({ activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED });
            logger.info('Existing ownership requests cleared');
        }

        // Check existing ownership requests to avoid duplicates
        const existingRequests = await LeadActivity.find({
            activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        }).select('leadId');

        const existingLeadIds = new Set(existingRequests.map(req => req.leadId.toString()));

        // Create 5-10 random ownership requests
        const requestCount = Math.floor(Math.random() * 6) + 5; // 5-10 requests
        const requestsToCreate = [];
        const now = new Date();

        let created = 0;
        const usedLeadIds = new Set();

        for (let i = 0; i < requestCount && created < requestCount; i++) {
            // Get a random lead that doesn't already have a pending request
            const availableLeads = leads.filter(
                lead => !existingLeadIds.has(lead._id.toString()) && !usedLeadIds.has(lead._id.toString())
            );

            if (availableLeads.length === 0) {
                break; // No more leads available
            }

            const lead = availableLeads[Math.floor(Math.random() * availableLeads.length)];
            usedLeadIds.add(lead._id.toString());

            // Current owner (from lead)
            const currentOwnerId = lead.ownerId;

            // Get a different user as requested owner
            const otherUsers = users.filter(
                user => user._id.toString() !== currentOwnerId.toString()
            );

            if (otherUsers.length === 0) {
                continue; // Skip if no other users available
            }

            const requestedOwner = otherUsers[Math.floor(Math.random() * otherUsers.length)];

            // Random timestamp (within last 14 days)
            const daysAgo = Math.floor(Math.random() * 14);
            const hoursAgo = Math.floor(Math.random() * 24);
            const timestamp = new Date(now);
            timestamp.setDate(timestamp.getDate() - daysAgo);
            timestamp.setHours(timestamp.getHours() - hoursAgo);

            // Create new LeadActivity instance with timestamp
            const activity = new LeadActivity({
                leadId: lead._id,
                activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
                performedBy: currentOwnerId, // Current owner requests the change
                ownerAtTime: currentOwnerId, // Owner at the time of request
                metadata: {
                    requestedOwnerId: requestedOwner._id.toString(),
                    currentOwnerId: currentOwnerId.toString(),
                    reason: 'Workload rebalancing',
                },
                description: `Ownership change requested from ${currentOwnerId} to ${requestedOwner._id}`,
                timestamp, // Set timestamp directly
            });

            requestsToCreate.push(activity);

            created++;
        }

        // Insert all ownership requests by saving each one (since they're model instances with timestamps)
        if (requestsToCreate.length > 0) {
            const inserted = [];
            for (const activity of requestsToCreate) {
                await activity.save();
                inserted.push(activity);
            }

            logger.info(`\n✓ Ownership request seeding completed successfully!`);
            logger.info(`Created ${inserted.length} ownership requests`);

            // Display summary
            console.log('\n=== Seeded Ownership Requests ===');
            for (const req of inserted) {
                const lead = leads.find(l => l._id.toString() === req.leadId.toString());
                const currentOwner = users.find(u => u._id.toString() === req.ownerAtTime.toString());
                const requestedOwner = users.find(u => u._id.toString() === req.metadata.requestedOwnerId);
                console.log(`Lead: ${lead ? lead.leadName : req.leadId}`);
                console.log(`  Current Owner: ${currentOwner ? currentOwner.name : req.ownerAtTime}`);
                console.log(`  Requested Owner: ${requestedOwner ? requestedOwner.name : req.metadata.requestedOwnerId}`);
                console.log(`  Date: ${req.timestamp ? req.timestamp.toLocaleDateString() : 'N/A'}`);
                console.log('---');
            }
        } else {
            logger.info('No ownership requests created (all leads already have pending requests)');
        }

        // Close database connection
        await mongoose.connection.close();
        logger.info('Database connection closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error seeding ownership requests:', error);
        console.error('Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run seed function
seedOwnershipRequests();

