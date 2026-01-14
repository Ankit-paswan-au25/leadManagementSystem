const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const PERMISSIONS = require('../core/permissions');
const {
  listPendingRequests,
  approveOwnershipChange,
  rejectOwnershipChange,
} = require('../controllers/ownership.controller');

/**
 * GET /ownership/requests
 * List all pending ownership change requests
 * Access: ADMIN only (permission: CAN_APPROVE_OWNERSHIP)
 */
router.get(
  '/requests',
  authMiddleware,
  authorize(PERMISSIONS.CAN_APPROVE_OWNERSHIP),
  asyncHandler(listPendingRequests)
);

/**
 * POST /ownership/requests/:leadId/approve
 * Approve ownership change request
 * Access: ADMIN only (permission: CAN_APPROVE_OWNERSHIP)
 */
router.post(
  '/requests/:leadId/approve',
  authMiddleware,
  authorize(PERMISSIONS.CAN_APPROVE_OWNERSHIP),
  asyncHandler(approveOwnershipChange)
);

/**
 * POST /ownership/requests/:leadId/reject
 * Reject ownership change request
 * Access: ADMIN only (permission: CAN_APPROVE_OWNERSHIP)
 */
router.post(
  '/requests/:leadId/reject',
  authMiddleware,
  authorize(PERMISSIONS.CAN_APPROVE_OWNERSHIP),
  asyncHandler(rejectOwnershipChange)
);

module.exports = router;

