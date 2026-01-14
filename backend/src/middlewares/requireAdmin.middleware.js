const ApiError = require('../core/ApiError');

/**
 * Admin Guard Middleware
 * 
 * Shortcut middleware that allows only ADMIN role.
 * Use this when you don't need permission granularity,
 * just a simple admin-only check.
 * 
 * Must be used AFTER authMiddleware (which sets req.user).
 * 
 * Usage:
 * router.get('/admin-only', authMiddleware, requireAdmin, controller);
 */
const requireAdmin = (req, res, next) => {
  // Ensure user is authenticated (should be set by authMiddleware)
  if (!req.user || !req.user.role) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  // Check if user is admin
  if (req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Admin access required'));
  }

  // Allow request to proceed
  next();
};

module.exports = requireAdmin;

