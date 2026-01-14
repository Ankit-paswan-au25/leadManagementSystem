const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const PERMISSIONS = require('../core/permissions');
const { createLead, getLeads, getLeadById, getLeadActivities, requestOwnerChange, updateLead } = require('../controllers/lead.controller');
const { convertLeadToCustomer } = require('../controllers/customer.controller');

/**
 * POST /leads
 * Create a new lead
 * Access: ADMIN or USER (permission: CAN_CREATE_LEAD)
 */
router.post(
  '/',
  authMiddleware,
  authorize(PERMISSIONS.CAN_CREATE_LEAD),
  asyncHandler(createLead)
);

/**
 * GET /leads
 * Get leads (filtered by role)
 * Access: ADMIN (all leads) or USER (own leads only)
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(getLeads)
);

/**
 * POST /leads/:id/owner-change-request
 * Request ownership change for a lead
 * Access: USER (permission: CAN_CREATE_LEAD)
 */
router.post(
  '/:id/owner-change-request',
  authMiddleware,
  authorize(PERMISSIONS.CAN_CREATE_LEAD),
  asyncHandler(requestOwnerChange)
);

/**
 * POST /leads/:id/convert-to-customer
 * Convert a lead to customer
 * Access: ADMIN or USER (permission: CAN_MANAGE_CUSTOMERS or CAN_CREATE_LEAD)
 */
router.post(
  '/:id/convert-to-customer',
  authMiddleware,
  authorize([PERMISSIONS.CAN_MANAGE_CUSTOMERS, PERMISSIONS.CAN_CREATE_LEAD], 'any'),
  asyncHandler(convertLeadToCustomer)
);

/**
 * GET /leads/:id/activities
 * Get activities for a specific lead
 * Access: ADMIN (all leads) or USER (own leads only)
 */
router.get(
  '/:id/activities',
  authMiddleware,
  asyncHandler(getLeadActivities)
);

/**
 * PUT /leads/:id
 * Update a lead
 * Access: ADMIN (all leads) or USER (own leads only)
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(updateLead)
);

/**
 * GET /leads/:id
 * Get a single lead by ID
 * Access: ADMIN (all leads) or USER (own leads only)
 * Note: This route should be last to avoid conflicts with more specific routes
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(getLeadById)
);

module.exports = router;

