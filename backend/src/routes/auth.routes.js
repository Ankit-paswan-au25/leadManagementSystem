const express = require('express');
const router = express.Router();
const asyncHandler = require('../core/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const { login, register, getUsers } = require('../controllers/auth.controller');

/**
 * POST /auth/register
 * Register new user endpoint
 */
router.post('/register', asyncHandler(register));

/**
 * POST /auth/login
 * Login endpoint
 */
router.post('/login', asyncHandler(login));

/**
 * GET /auth/users
 * Get all active users
 * Access: Authenticated users
 */
router.get('/users', authMiddleware, asyncHandler(getUsers));

module.exports = router;

