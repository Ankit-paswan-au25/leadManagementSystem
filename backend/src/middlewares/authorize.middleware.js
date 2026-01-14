const ApiError = require('../core/ApiError');
const { hasPermission, hasAnyPermission, hasAllPermissions } = require('../core/rolePermissions');

/**
 * Authorization Middleware Factory
 * 
 * Creates middleware that checks if the user has required permission(s).
 * Must be used AFTER authMiddleware (which sets req.user).
 * 
 * Usage:
 * - authorize('CAN_CREATE_LEAD') - requires single permission
 * - authorize(['CAN_EDIT_LEAD', 'CAN_DELETE_LEAD'], 'any') - requires any of the permissions
 * - authorize(['CAN_EDIT_LEAD', 'CAN_DELETE_LEAD'], 'all') - requires all permissions
 * 
 * @param {string|string[]} permissions - Single permission or array of permissions
 * @param {string} mode - 'any' or 'all' (default: 'any' for arrays, ignored for single permission)
 * @returns {Function} - Express middleware function
 */
const authorize = (permissions, mode = 'any') => {
  return (req, res, next) => {
    // Ensure user is authenticated (should be set by authMiddleware)
    if (!req.user || !req.user.role) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const userRole = req.user.role;
    let hasAccess = false;

    // Handle single permission
    if (typeof permissions === 'string') {
      hasAccess = hasPermission(userRole, permissions);
    }
    // Handle array of permissions
    else if (Array.isArray(permissions)) {
      if (permissions.length === 0) {
        // Empty array means no permission required (allow all authenticated users)
        hasAccess = true;
      } else if (mode === 'all') {
        hasAccess = hasAllPermissions(userRole, permissions);
      } else {
        // Default: 'any' mode
        hasAccess = hasAnyPermission(userRole, permissions);
      }
    } else {
      return next(ApiError.internal('Invalid permission configuration'));
    }

    // Deny access if user doesn't have required permission(s)
    if (!hasAccess) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    // Allow request to proceed
    next();
  };
};

module.exports = authorize;

