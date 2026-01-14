const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const ApiResponse = require('../core/ApiResponse');
const config = require('../config/env');

/**
 * GET /health
 * Health check endpoint
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, 200, 'OK', {
      status: 'ok',
      environment: config.env,
      timestamp: new Date().toISOString(),
    });
  })
);

module.exports = router;

