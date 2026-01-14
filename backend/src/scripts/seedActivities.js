/**
 * Seed Activities Script
 * Creates sample lead activities (various types)
 * 
 * Usage: node src/scripts/seedActivities.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const Lead = require('../models/Lead.model');
const { ACTIVITY_TYPE, LEAD_STATUS } = require('../core/leadEnums');
const config = require('../config/env');
const logger = require('../config/logger');

const activityTypes = [
    ACTIVITY_TYPE.CREATED,
    ACTIVITY_TYPE.STATUS_CHANGED,
    ACTIVITY_TYPE.CONTACTED,
    ACTIVITY_TYPE.EMAIL_SENT,
    ACTIVITY_TYPE.EMAIL_FAILED,
    ACTIVITY_TYPE.EMAIL_RECEIVED,
    ACTIVITY_TYPE.CLIENT_REPLIED,
    ACTIVITY_TYPE.NOTE_ADDED,
    ACTIVITY_TYPE.FOLLOW_UP_SCHEDULED,
    ACTIVITY_TYPE.FOLLOW_UP_COMPLETED,
    ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
    ACTIVITY_TYPE.SCHEDULE_PAUSED,
    ACTIVITY_TYPE.SCHEDULE_RESUMED,
];

const activityDescriptions = {
    CREATED: 'Lead was created in the system',
    STATUS_CHANGED: 'Lead status updated',
    CONTACTED: 'Lead was contacted via phone',
    EMAIL_SENT: 'Email sent to the lead',
    EMAIL_FAILED: 'Failed to send email to the lead',
    EMAIL_RECEIVED: 'Received email from the lead',
    CLIENT_REPLIED: 'Client replied to the email',
    NOTE_ADDED: 'Note added to the lead',
    FOLLOW_UP_SCHEDULED: 'Follow-up meeting scheduled',
    FOLLOW_UP_COMPLETED: 'Follow-up meeting completed',
    FOLLOWUP_TRIGGERED: 'Automated follow-up triggered',
    SCHEDULE_PAUSED: 'Follow-up schedule paused',
    SCHEDULE_RESUMED: 'Follow-up schedule resumed',
};

async function seedActivities() {
    try {
        // Connect to database
        logger.info('Connecting to database...');
        await mongoose.connect(config.mongoUri);
        logger.info('Database connected successfully');

        // Get all active users
        const users = await User.find({ status: 'ACTIVE' });

        if (users.length === 0) {
            logger.error('No active users found. Please seed users first.');
            await mongoose.connection.close();
            process.exit(1);
        }

        logger.info(`Found ${users.length} active user(s)`);

        // Get leads
        const leads = await Lead.find().limit(50);

        if (leads.length === 0) {
            logger.error('No leads found. Please seed leads first.');
            await mongoose.connection.close();
            process.exit(1);
        }

        logger.info(`Found ${leads.length} lead(s)`);

        // Clear existing activities if CLEAR_ACTIVITIES environment variable is set
        if (process.env.CLEAR_ACTIVITIES === 'true') {
            logger.info('Clearing existing activities...');
            await LeadActivity.deleteMany({});
            logger.info('Existing activities cleared');
        }

        // Create 50-100 random activities
        const activityCount = Math.floor(Math.random() * 51) + 50; // 50-100 activities
        const activitiesToCreate = [];
        const now = new Date();

        for (let i = 0; i < activityCount; i++) {
            // Random lead
            const lead = leads[Math.floor(Math.random() * leads.length)];

            // Random user (performer)
            const performer = users[Math.floor(Math.random() * users.length)];

            // Owner at time (usually the lead owner, but sometimes the performer)
            const ownerAtTime = Math.random() < 0.8 ? lead.ownerId : performer._id;

            // Random activity type
            const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

            // Prepare metadata based on activity type
            let metadata = {};
            if (activityType === ACTIVITY_TYPE.STATUS_CHANGED) {
                const statuses = Object.values(LEAD_STATUS);
                const oldStatus = statuses[Math.floor(Math.random() * statuses.length)];
                const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
                metadata = { oldStatus, newStatus };
            } else if (activityType === ACTIVITY_TYPE.EMAIL_SENT || activityType === ACTIVITY_TYPE.EMAIL_FAILED) {
                metadata = {
                    emailSubject: 'Re: Your inquiry',
                    recipient: lead.email,
                };
            } else if (activityType === ACTIVITY_TYPE.NOTE_ADDED) {
                metadata = {
                    note: 'Discussed pricing and features with the client',
                };
            } else if (activityType === ACTIVITY_TYPE.FOLLOW_UP_SCHEDULED) {
                const followUpDate = new Date();
                followUpDate.setDate(followUpDate.getDate() + Math.floor(Math.random() * 7) + 1);
                metadata = {
                    scheduledDate: followUpDate.toISOString(),
                };
            }

            // Description
            const description = activityDescriptions[activityType] || `Activity: ${activityType}`;

            // Random timestamp (within last 60 days)
            const daysAgo = Math.floor(Math.random() * 60);
            const hoursAgo = Math.floor(Math.random() * 24);
            const minutesAgo = Math.floor(Math.random() * 60);
            const timestamp = new Date(now);
            timestamp.setDate(timestamp.getDate() - daysAgo);
            timestamp.setHours(timestamp.getHours() - hoursAgo);
            timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

            // Create new LeadActivity instance with timestamp
            const activity = new LeadActivity({
                leadId: lead._id,
                activityType,
                performedBy: performer._id,
                ownerAtTime,
                metadata,
                description,
                timestamp, // Set timestamp directly
            });

            activitiesToCreate.push(activity);
        }

        // Insert all activities by saving each one (since they're model instances with timestamps)
        const inserted = [];
        for (const activity of activitiesToCreate) {
            await activity.save();
            inserted.push(activity);
        }

        logger.info(`\n✓ Activity seeding completed successfully!`);
        logger.info(`Created ${inserted.length} activities`);

        // Display summary
        console.log('\n=== Seeded Activities ===');
        const byType = {};
        inserted.forEach((activity) => {
            if (!byType[activity.activityType]) {
                byType[activity.activityType] = 0;
            }
            byType[activity.activityType]++;
        });

        for (const [type, count] of Object.entries(byType)) {
            console.log(`${type}: ${count}`);
        }

        // Close database connection
        await mongoose.connection.close();
        logger.info('Database connection closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error seeding activities:', error);
        console.error('Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run seed function
seedActivities();

