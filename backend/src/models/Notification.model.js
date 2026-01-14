const mongoose = require('mongoose');

/**
 * Notification Schema
 * 
 * Tracks notifications/events for users in the system.
 * Can be related to leads, customers, or system events.
 */
const notificationSchema = new mongoose.Schema(
    {
        // Who receives this notification
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },

        // Notification type
        type: {
            type: String,
            enum: [
                'EMAIL_SENT',
                'EMAIL_FAILED',
                'CLIENT_REPLIED',
                'FOLLOWUP_TRIGGERED',
                'OWNER_CHANGED',
                'SCHEDULE_PAUSED',
                'LEAD_CREATED',
                'PRODUCT_EXPIRING',
            ],
            required: [true, 'Notification type is required'],
            index: true,
        },

        // Notification content
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },

        // Related entity (optional)
        entityType: {
            type: String,
            enum: ['LEAD', 'CUSTOMER'],
            default: null,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'entityType',
            default: null,
        },

        // Read status
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 }); // Get user notifications, newest first
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 }); // Get unread notifications
notificationSchema.index({ createdAt: -1 }); // Get all notifications, newest first (for admin)

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

