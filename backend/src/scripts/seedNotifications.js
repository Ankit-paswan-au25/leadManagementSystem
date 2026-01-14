/**
 * Seed Notifications Script
 * Creates sample notifications for admin and users
 * 
 * Usage: node src/scripts/seedNotifications.js
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const Lead = require('../models/Lead.model');
const Customer = require('../models/Customer.model');
const config = require('../config/env');
const logger = require('../config/logger');

const notificationTypes = [
    'EMAIL_SENT',
    'EMAIL_FAILED',
    'CLIENT_REPLIED',
    'FOLLOWUP_TRIGGERED',
    'OWNER_CHANGED',
    'SCHEDULE_PAUSED',
    'LEAD_CREATED',
    'PRODUCT_EXPIRING',
];

const notificationTemplates = {
    EMAIL_SENT: [
        { title: 'Email Sent Successfully', description: 'Email sent to {leadName} at {email}' },
        { title: 'Follow-up Email Delivered', description: 'Follow-up email delivered to {leadName}' },
        { title: 'Email Notification', description: 'Email sent to {companyName} regarding your inquiry' },
    ],
    EMAIL_FAILED: [
        { title: 'Email Delivery Failed', description: 'Failed to send email to {leadName} at {email}' },
        { title: 'Email Bounce', description: 'Email bounced back from {email}' },
    ],
    CLIENT_REPLIED: [
        { title: 'New Reply Received', description: '{leadName} replied to your email' },
        { title: 'Client Response', description: 'You received a reply from {companyName}' },
        { title: 'Lead Engagement', description: '{leadName} responded to your message' },
    ],
    FOLLOWUP_TRIGGERED: [
        { title: 'Follow-up Scheduled', description: 'Follow-up scheduled for {leadName}' },
        { title: 'Follow-up Reminder', description: 'Time to follow up with {leadName}' },
    ],
    OWNER_CHANGED: [
        { title: 'Lead Ownership Changed', description: 'Lead {leadName} ownership has been transferred' },
        { title: 'Ownership Update', description: 'You are now the owner of {leadName}' },
    ],
    SCHEDULE_PAUSED: [
        { title: 'Schedule Paused', description: 'Follow-up schedule paused for {leadName}' },
        { title: 'Auto-follow-up Disabled', description: 'Automatic follow-ups disabled for {leadName}' },
    ],
    LEAD_CREATED: [
        { title: 'New Lead Created', description: 'New lead {leadName} from {companyName} has been added' },
        { title: 'Lead Added', description: 'A new lead {leadName} was created in the system' },
    ],
    PRODUCT_EXPIRING: [
        { title: 'Product Expiring Soon', description: 'Product subscription for {customerName} expires in 7 days' },
        { title: 'Renewal Reminder', description: 'Time to renew subscription for {customerName}' },
    ],
};

async function seedNotifications() {
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

        // Get leads and customers for entity references
        const leads = await Lead.find().limit(20);
        const customers = await Customer.find().limit(10);

        // Clear existing notifications if CLEAR_NOTIFICATIONS environment variable is set
        if (process.env.CLEAR_NOTIFICATIONS === 'true') {
            logger.info('Clearing existing notifications...');
            await Notification.deleteMany({});
            logger.info('Existing notifications cleared');
        }

        const notificationsToCreate = [];
        const now = new Date();

        // Create 30-50 random notifications
        const notificationCount = Math.floor(Math.random() * 21) + 30; // 30-50 notifications

        for (let i = 0; i < notificationCount; i++) {
            // Random user
            const user = users[Math.floor(Math.random() * users.length)];

            // Random notification type
            const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

            // Get template
            const templates = notificationTemplates[type];
            const template = templates[Math.floor(Math.random() * templates.length)];

            // Prepare title and description
            let title = template.title;
            let description = template.description;
            let entityType = null;
            let entityId = null;

            // Replace placeholders with actual data
            if (type === 'PRODUCT_EXPIRING' && customers.length > 0) {
                const customer = customers[Math.floor(Math.random() * customers.length)];
                description = description.replace('{customerName}', customer.customerName);
                entityType = 'CUSTOMER';
                entityId = customer._id;
            } else if (leads.length > 0) {
                const lead = leads[Math.floor(Math.random() * leads.length)];
                description = description.replace('{leadName}', lead.leadName);
                description = description.replace('{email}', lead.email);
                description = description.replace('{companyName}', lead.companyName || 'Company');
                entityType = 'LEAD';
                entityId = lead._id;
            } else {
                // Fallback if no leads/customers
                description = description.replace('{leadName}', 'Sample Lead');
                description = description.replace('{email}', 'sample@example.com');
                description = description.replace('{companyName}', 'Sample Company');
            }

            // Random timestamp (within last 30 days)
            const daysAgo = Math.floor(Math.random() * 30);
            const hoursAgo = Math.floor(Math.random() * 24);
            const timestamp = new Date(now);
            timestamp.setDate(timestamp.getDate() - daysAgo);
            timestamp.setHours(timestamp.getHours() - hoursAgo);

            // Random read status (70% unread for recent notifications, 90% read for old ones)
            const isRecent = daysAgo < 7;
            const read = isRecent ? Math.random() < 0.3 : Math.random() < 0.9;

            const notification = {
                userId: user._id,
                type,
                title,
                description,
                entityType,
                entityId,
                read,
                createdAt: timestamp,
                updatedAt: timestamp,
            };

            // Store for later insertion (we'll need to use insertMany with timestamps)
            notificationsToCreate.push(notification);
        }

        // Insert notifications by creating instances (to properly set timestamps)
        const inserted = [];
        for (const notifData of notificationsToCreate) {
            const notification = new Notification(notifData);
            // Set createdAt and updatedAt before saving
            notification.createdAt = notifData.createdAt;
            notification.updatedAt = notifData.updatedAt;
            await notification.save();
            inserted.push(notification);
        }

        logger.info(`\n✓ Notification seeding completed successfully!`);
        logger.info(`Created ${inserted.length} notifications`);

        // Display summary
        console.log('\n=== Seeded Notifications ===');
        const byUser = {};
        inserted.forEach((notif, idx) => {
            const originalNotif = notificationsToCreate[idx];
            const userId = notif.userId.toString();
            if (!byUser[userId]) {
                byUser[userId] = { total: 0, unread: 0 };
            }
            byUser[userId].total++;
            if (!originalNotif.read) {
                byUser[userId].unread++;
            }
        });

        for (const [userId, stats] of Object.entries(byUser)) {
            const user = users.find(u => u._id.toString() === userId);
            console.log(`User: ${user ? user.name : userId}`);
            console.log(`  Total: ${stats.total}, Unread: ${stats.unread}`);
        }

        // Close database connection
        await mongoose.connection.close();
        logger.info('Database connection closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error seeding notifications:', error);
        console.error('Error:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run seed function
seedNotifications();

