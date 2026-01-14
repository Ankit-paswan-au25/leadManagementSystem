const PERMISSIONS = require('./permissions');

/**
 * Role → Permission Mapping
 * 
 * Defines which permissions each role has.
 * ADMIN has all permissions.
 * USER has limited permissions.
 */

// Get all permission values as an array
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Get permissions for a given role
 * @param {string} role - User role (ADMIN or USER)
 * @returns {string[]} - Array of permission strings
 */
const getPermissionsForRole = (role) => {
  switch (role) {
    case 'ADMIN':
      return ALL_PERMISSIONS; // Admin has all permissions

    case 'USER':
      return [
        // Lead Management - Limited
        PERMISSIONS.CAN_CREATE_LEAD,
        PERMISSIONS.CAN_VIEW_LEAD, // Only own leads (enforced in controller)
        PERMISSIONS.CAN_EDIT_LEAD, // Only own leads (enforced in controller)

        // Product Management - View only
        PERMISSIONS.CAN_VIEW_PRODUCTS,

        // Customer Management - View only
        PERMISSIONS.CAN_VIEW_CUSTOMERS,

        // No assignment, approval, or admin features
      ];

    default:
      return []; // Unknown role has no permissions
  }
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if role has permission
 */
const hasPermission = (role, permission) => {
  const rolePermissions = getPermissionsForRole(role);
  return rolePermissions.includes(permission);
};

/**
 * Check if a role has any of the given permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if role has at least one permission
 */
const hasAnyPermission = (role, permissions) => {
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if a role has all of the given permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - True if role has all permissions
 */
const hasAllPermissions = (role, permissions) => {
  return permissions.every(permission => hasPermission(role, permission));
};

module.exports = {
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};

