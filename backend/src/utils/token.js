const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate JWT token for user
 * @param {Object} user - User object with _id and role
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const options = {
    expiresIn: '8h', // 8 hours expiry
  };

  return jwt.sign(payload, config.jwtSecret, options);
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};

