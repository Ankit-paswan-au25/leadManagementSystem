const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const PERMISSIONS = require('../core/permissions');
const { getAllActivities } = require('../controllers/activity.controller');

/**
 * GET /activities
 * Get all activities (for Activity Logs page)
 * Access: ADMIN only
 */
router.get(
    '/',
    authMiddleware,
    asyncHandler(getAllActivities) // Controller checks for ADMIN role
);

module.exports = router;

