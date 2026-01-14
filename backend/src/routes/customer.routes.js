const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const PERMISSIONS = require('../core/permissions');
const { assignProductToCustomer } = require('../controllers/product.controller');
const { getCustomers } = require('../controllers/customer.controller');

/**
 * GET /customers
 * Get customers (filtered by role)
 * Access: ADMIN (all customers) or USER (own customers only)
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(getCustomers)
);

/**
 * POST /customers/:id/products
 * Assign product to customer
 * Access: ADMIN only (permission: CAN_MANAGE_PRODUCTS)
 */
router.post(
  '/:id/products',
  authMiddleware,
  authorize(PERMISSIONS.CAN_MANAGE_PRODUCTS),
  asyncHandler(assignProductToCustomer)
);

module.exports = router;

