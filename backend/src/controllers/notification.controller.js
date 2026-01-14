const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');

/**
 * Get Notifications
 * GET /notifications
 * 
 * Access: Authenticated users (ADMIN or USER)
 * 
 * Returns:
 * - USER: Only their own notifications
 * - ADMIN: All notifications with user information
 */
const getNotifications = async (req, res) => {
    const currentUser = req.user;
    const userId = currentUser.userId;

    try {
        let query = {};
        let populateFields = [];

        // USER only sees their own notifications
        // ADMIN sees all notifications
        if (currentUser.role !== 'ADMIN') {
            query.userId = userId;
        } else {
            // Admin sees all notifications, populate user info
            populateFields.push({ path: 'userId', select: 'name email' });
        }

        // Fetch notifications
        let notifications = await Notification.find(query)
            .populate(populateFields)
            .sort({ createdAt: -1 }) // Newest first
            .select('-__v')
            .lean();

        // Format response
        const notificationsData = notifications.map(notification => {
            const notificationData = {
                id: notification._id.toString(),
                type: notification.type,
                title: notification.title,
                description: notification.description,
                entityType: notification.entityType || null,
                entityId: notification.entityId ? notification.entityId.toString() : null,
                createdAt: notification.createdAt,
                read: notification.read || false,
            };

            // Add user info for admins
            if (currentUser.role === 'ADMIN' && notification.userId) {
                const user = notification.userId;
                notificationData.user = {
                    id: user._id ? user._id.toString() : user.toString(),
                    name: user.name || 'Unknown',
                    email: user.email || 'Unknown',
                };
            }

            return notificationData;
        });

        return ApiResponse.success(res, 200, 'Notifications fetched successfully', {
            notifications: notificationsData,
            count: notificationsData.length,
        });
    } catch (error) {
        // If it's already an ApiError, let it propagate
        if (error.statusCode) {
            throw error;
        }
        // Otherwise, wrap it
        throw ApiError.internalServerError('Failed to fetch notifications');
    }
};

/**
 * Mark Notification as Read
 * POST /notifications/:id/read
 * 
 * Access: Authenticated users (ADMIN or USER)
 * 
 * USER can only mark their own notifications as read
 * ADMIN can mark any notification as read
 */
const markAsRead = async (req, res) => {
    const currentUser = req.user;
    const userId = currentUser.userId;
    const { id: notificationId } = req.params;

    try {
        // Find notification
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            throw ApiError.notFound('Notification not found');
        }

        // USER can only mark their own notifications as read
        if (currentUser.role !== 'ADMIN' && notification.userId.toString() !== userId) {
            throw ApiError.forbidden('You can only mark your own notifications as read');
        }

        // Mark as read
        notification.read = true;
        await notification.save();

        return ApiResponse.success(res, 200, 'Notification marked as read', {
            id: notification._id.toString(),
            read: true,
        });
    } catch (error) {
        // If it's already an ApiError, let it propagate
        if (error.statusCode) {
            throw error;
        }
        // Otherwise, wrap it
        throw ApiError.internalServerError('Failed to mark notification as read');
    }
};

module.exports = {
    getNotifications,
    markAsRead,
};

