const {
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} = require('../core/rolePermissions');
const PERMISSIONS = require('../core/permissions');

describe('Role Permissions', () => {
  describe('getPermissionsForRole', () => {
    it('should return all permissions for ADMIN', () => {
      const adminPermissions = getPermissionsForRole('ADMIN');
      const allPermissions = Object.values(PERMISSIONS);

      expect(adminPermissions).toHaveLength(allPermissions.length);
      allPermissions.forEach(permission => {
        expect(adminPermissions).toContain(permission);
      });
    });

    it('should return limited permissions for USER', () => {
      const userPermissions = getPermissionsForRole('USER');

      // USER should have some permissions
      expect(userPermissions.length).toBeGreaterThan(0);

      // USER should have CAN_CREATE_LEAD
      expect(userPermissions).toContain(PERMISSIONS.CAN_CREATE_LEAD);

      // USER should NOT have admin-only permissions
      expect(userPermissions).not.toContain(PERMISSIONS.CAN_ASSIGN_LEAD);
      expect(userPermissions).not.toContain(PERMISSIONS.CAN_APPROVE_OWNERSHIP);
      expect(userPermissions).not.toContain(PERMISSIONS.CAN_MANAGE_USERS);
      expect(userPermissions).not.toContain(PERMISSIONS.CAN_SYNC_ZOHO);
    });

    it('should return empty array for unknown role', () => {
      const unknownPermissions = getPermissionsForRole('UNKNOWN_ROLE');
      expect(unknownPermissions).toEqual([]);
    });

    it('should return empty array for null/undefined role', () => {
      expect(getPermissionsForRole(null)).toEqual([]);
      expect(getPermissionsForRole(undefined)).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN with any permission', () => {
      Object.values(PERMISSIONS).forEach(permission => {
        expect(hasPermission('ADMIN', permission)).toBe(true);
      });
    });

    it('should return true for USER with allowed permission', () => {
      expect(hasPermission('USER', PERMISSIONS.CAN_CREATE_LEAD)).toBe(true);
      expect(hasPermission('USER', PERMISSIONS.CAN_VIEW_LEAD)).toBe(true);
      expect(hasPermission('USER', PERMISSIONS.CAN_VIEW_PRODUCTS)).toBe(true);
    });

    it('should return false for USER with restricted permission', () => {
      expect(hasPermission('USER', PERMISSIONS.CAN_ASSIGN_LEAD)).toBe(false);
      expect(hasPermission('USER', PERMISSIONS.CAN_APPROVE_OWNERSHIP)).toBe(false);
      expect(hasPermission('USER', PERMISSIONS.CAN_MANAGE_USERS)).toBe(false);
      expect(hasPermission('USER', PERMISSIONS.CAN_SYNC_ZOHO)).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(hasPermission('UNKNOWN_ROLE', PERMISSIONS.CAN_CREATE_LEAD)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      const permissions = [
        PERMISSIONS.CAN_ASSIGN_LEAD, // USER doesn't have
        PERMISSIONS.CAN_CREATE_LEAD, // USER has
      ];
      expect(hasAnyPermission('USER', permissions)).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const permissions = [
        PERMISSIONS.CAN_ASSIGN_LEAD,
        PERMISSIONS.CAN_APPROVE_OWNERSHIP,
        PERMISSIONS.CAN_MANAGE_USERS,
      ];
      expect(hasAnyPermission('USER', permissions)).toBe(false);
    });

    it('should return true for ADMIN with any permissions', () => {
      const permissions = [
        PERMISSIONS.CAN_ASSIGN_LEAD,
        PERMISSIONS.CAN_APPROVE_OWNERSHIP,
      ];
      expect(hasAnyPermission('ADMIN', permissions)).toBe(true);
    });

    it('should return false for empty permissions array', () => {
      expect(hasAnyPermission('USER', [])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const permissions = [
        PERMISSIONS.CAN_CREATE_LEAD,
        PERMISSIONS.CAN_VIEW_LEAD,
        PERMISSIONS.CAN_VIEW_PRODUCTS,
      ];
      expect(hasAllPermissions('USER', permissions)).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const permissions = [
        PERMISSIONS.CAN_CREATE_LEAD, // USER has
        PERMISSIONS.CAN_ASSIGN_LEAD, // USER doesn't have
      ];
      expect(hasAllPermissions('USER', permissions)).toBe(false);
    });

    it('should return true for ADMIN with all permissions', () => {
      const permissions = [
        PERMISSIONS.CAN_ASSIGN_LEAD,
        PERMISSIONS.CAN_APPROVE_OWNERSHIP,
        PERMISSIONS.CAN_MANAGE_USERS,
      ];
      expect(hasAllPermissions('ADMIN', permissions)).toBe(true);
    });

    it('should return true for empty permissions array', () => {
      expect(hasAllPermissions('USER', [])).toBe(true);
    });
  });
});

