const Notification = require('../models/Notification.model');
const logger = require('../config/logger');

/**
 * Helper function to create notifications
 * 
 * @param {Object} params
 * @param {string|string[]} params.userId - User ID(s) to notify (single ID or array)
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.description - Notification description
 * @param {string} params.entityType - Optional entity type ('LEAD' or 'CUSTOMER')
 * @param {string} params.entityId - Optional entity ID
 * @returns {Promise<Notification|Notification[]>} - Created notification(s)
 */
const createNotification = async ({
  userId,
  type,
  title,
  description,
  entityType = null,
  entityId = null,
}) => {
  try {
    // Handle single user or array of users
    const userIds = Array.isArray(userId) ? userId : [userId];

    // Create notifications for all users
    const notifications = userIds.map(userIdToNotify => ({
      userId: userIdToNotify,
      type,
      title,
      description,
      entityType,
      entityId,
      read: false,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Log success (non-blocking)
    logger.info(`Created ${createdNotifications.length} notification(s)`, {
      type,
      userIds: userIds.length,
    });

    // Return single notification or array based on input
    return Array.isArray(userId) ? createdNotifications : createdNotifications[0];
  } catch (error) {
    // Log error but don't throw - notification creation failures shouldn't block main flow
    logger.error('Failed to create notification', {
      type,
      userId,
      error: error.message,
    });
    // Return null or empty array to indicate failure without throwing
    return Array.isArray(userId) ? [] : null;
  }
};

module.exports = {
  createNotification,
};

