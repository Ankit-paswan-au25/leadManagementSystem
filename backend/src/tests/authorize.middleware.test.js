const request = require('supertest');
const express = require('express');
const authorize = require('../middlewares/authorize.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const PERMISSIONS = require('../core/permissions');
const errorMiddleware = require('../core/errorMiddleware');
const { generateToken } = require('../utils/token');
const User = require('../models/User.model');

// Create test app with protected routes
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  
  // Add auth middleware to set req.user from token
  testApp.use(authMiddleware);

  // Route requiring single permission
  testApp.get(
    '/single-permission',
    authorize(PERMISSIONS.CAN_ASSIGN_LEAD),
    (req, res) => {
      res.json({ status: 'success', message: 'Access granted' });
    }
  );

  // Route requiring any of multiple permissions
  testApp.get(
    '/any-permission',
    authorize([PERMISSIONS.CAN_ASSIGN_LEAD, PERMISSIONS.CAN_CREATE_LEAD], 'any'),
    (req, res) => {
      res.json({ status: 'success', message: 'Access granted' });
    }
  );

  // Route requiring all permissions
  testApp.get(
    '/all-permissions',
    authorize([PERMISSIONS.CAN_CREATE_LEAD, PERMISSIONS.CAN_VIEW_LEAD], 'all'),
    (req, res) => {
      res.json({ status: 'success', message: 'Access granted' });
    }
  );

  // Route with no permissions (allows all authenticated users)
  testApp.get(
    '/no-permission',
    authorize([]),
    (req, res) => {
      res.json({ status: 'success', message: 'Access granted' });
    }
  );

  // Error middleware
  testApp.use(errorMiddleware);

  return testApp;
};

describe('Authorization Middleware', () => {
  let adminUser;
  let regularUser;
  let adminToken;
  let userToken;
  let testApp;

  beforeEach(async () => {
    // Create admin user
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await adminUser.save();
    adminToken = generateToken(adminUser);

    // Create regular user
    regularUser = new User({
      name: 'Regular User',
      email: 'user@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await regularUser.save();
    userToken = generateToken(regularUser);

    testApp = createTestApp();
  });

  describe('Single Permission Check', () => {
    it('should allow ADMIN for admin-only permission', async () => {
      const response = await request(testApp)
        .get('/single-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should deny USER for admin-only permission', async () => {
      const response = await request(testApp)
        .get('/single-permission')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'You do not have permission to perform this action');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(testApp)
        .get('/single-permission')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('Any Permission Check (OR logic)', () => {
    it('should allow USER if they have at least one permission', async () => {
      // USER has CAN_CREATE_LEAD but not CAN_ASSIGN_LEAD
      const response = await request(testApp)
        .get('/any-permission')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should allow ADMIN for any permission check', async () => {
      const response = await request(testApp)
        .get('/any-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });
  });

  describe('All Permissions Check (AND logic)', () => {
    it('should allow USER if they have all required permissions', async () => {
      // USER has both CAN_CREATE_LEAD and CAN_VIEW_LEAD
      const response = await request(testApp)
        .get('/all-permissions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should allow ADMIN for all permissions check', async () => {
      const response = await request(testApp)
        .get('/all-permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });
  });

  describe('No Permission Required', () => {
    it('should allow any authenticated user when no permissions required', async () => {
      const response = await request(testApp)
        .get('/no-permission')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should allow ADMIN when no permissions required', async () => {
      const response = await request(testApp)
        .get('/no-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });
  });

  describe('Edge Cases', () => {
    it('should return 401 if req.user is missing', async () => {
      // Create app without auth middleware
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.get('/test', authorize(PERMISSIONS.CAN_CREATE_LEAD), (req, res) => {
        res.json({ status: 'success' });
      });
      appWithoutAuth.use(errorMiddleware);

      const response = await request(appWithoutAuth)
        .get('/test')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });

    it('should return 401 if req.user.role is missing', async () => {
      // Create app that sets req.user without role (bypassing auth middleware)
      const appWithInvalidUser = express();
      appWithInvalidUser.use(express.json());
      appWithInvalidUser.use((req, res, next) => {
        // Manually set req.user without role to test authorize middleware
        req.user = { userId: '123' }; // No role
        next();
      });
      appWithInvalidUser.get('/test', authorize(PERMISSIONS.CAN_CREATE_LEAD), (req, res) => {
        res.json({ status: 'success' });
      });
      appWithInvalidUser.use(errorMiddleware);

      const response = await request(appWithInvalidUser)
        .get('/test')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });
  });
});

