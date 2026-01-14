const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const { getDashboardStats } = require('../controllers/dashboard.controller');

/**
 * GET /dashboard/stats
 * Get dashboard statistics for the logged-in user
 * Access: Authenticated (ADMIN or USER)
 */
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(getDashboardStats)
);

module.exports = router;

