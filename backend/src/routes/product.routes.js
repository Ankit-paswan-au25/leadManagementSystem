const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const { getProducts } = require('../controllers/product.controller');

/**
 * GET /products
 * Get all active products
 * Access: ADMIN or USER (all authenticated users can view products)
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(getProducts)
);

module.exports = router;

