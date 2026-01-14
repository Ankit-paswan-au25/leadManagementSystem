const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const { getNotifications, markAsRead } = require('../controllers/notification.controller');

/**
 * GET /notifications
 * Get notifications for the logged-in user
 * Access: Authenticated (ADMIN or USER)
 * - USER: Returns only their own notifications
 * - ADMIN: Returns all notifications with user information
 */
router.get(
    '/',
    authMiddleware,
    asyncHandler(getNotifications)
);

/**
 * POST /notifications/:id/read
 * Mark a notification as read
 * Access: Authenticated (ADMIN or USER)
 * - USER: Can only mark their own notifications
 * - ADMIN: Can mark any notification
 */
router.post(
    '/:id/read',
    authMiddleware,
    asyncHandler(markAsRead)
);

module.exports = router;

