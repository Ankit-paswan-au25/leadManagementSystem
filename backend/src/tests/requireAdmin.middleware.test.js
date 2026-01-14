const request = require('supertest');
const express = require('express');
const requireAdmin = require('../middlewares/requireAdmin.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const errorMiddleware = require('../core/errorMiddleware');
const { generateToken } = require('../utils/token');
const User = require('../models/User.model');

// Create test app with admin-only route
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  
  // Add auth middleware to set req.user from token
  testApp.use(authMiddleware);

  // Admin-only route
  testApp.get('/admin-only', requireAdmin, (req, res) => {
    res.json({
      status: 'success',
      message: 'Admin access granted',
      user: req.user,
    });
  });

  // Error middleware
  testApp.use(errorMiddleware);

  return testApp;
};

describe('Require Admin Middleware', () => {
  let adminUser;
  let regularUser;
  let adminToken;
  let userToken;
  let testApp;

  beforeEach(async () => {
    // Create admin user
    adminUser = new User({
      name: 'Admin User',
      email: 'admin2@test.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await adminUser.save();
    adminToken = generateToken(adminUser);

    // Create regular user
    regularUser = new User({
      name: 'Regular User',
      email: 'user2@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await regularUser.save();
    userToken = generateToken(regularUser);

    testApp = createTestApp();
  });

  describe('Admin Access', () => {
    it('should allow ADMIN to access admin-only route', async () => {
      const response = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Admin access granted');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('ADMIN');
    });
  });

  describe('User Access Denial', () => {
    it('should block USER from accessing admin-only route', async () => {
      const response = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Admin access required');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(testApp)
        .get('/admin-only')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      // Auth middleware returns "No token provided" when token is missing
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 if req.user is missing', async () => {
      // Create app without auth middleware
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.get('/test', requireAdmin, (req, res) => {
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
      // Create app that sets req.user without role
      const appWithInvalidUser = express();
      appWithInvalidUser.use(express.json());
      appWithInvalidUser.use((req, res, next) => {
        req.user = { userId: '123' }; // No role
        next();
      });
      appWithInvalidUser.get('/test', requireAdmin, (req, res) => {
        res.json({ status: 'success' });
      });
      appWithInvalidUser.use(errorMiddleware);

      const response = await request(appWithInvalidUser)
        .get('/test')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 for invalid token', async () => {
      const response = await request(testApp)
        .get('/admin-only')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });
});

