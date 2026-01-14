const request = require('supertest');
const express = require('express');
const User = require('../models/User.model');
const { generateToken } = require('../utils/token');
const authMiddleware = require('../middlewares/auth.middleware');
const errorMiddleware = require('../core/errorMiddleware');

// Create a test app with protected route
const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());

  // Protected route
  testApp.get('/protected', authMiddleware, (req, res) => {
    res.json({
      status: 'success',
      message: 'Protected route accessed',
      user: req.user,
    });
  });

  // Error middleware
  testApp.use(errorMiddleware);

  return testApp;
};

describe('Auth Middleware', () => {
  let testUser;
  let validToken;
  let testApp;

  beforeEach(async () => {
    // Create a test user
    testUser = new User({
      name: 'Test User',
      email: 'middleware@example.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Generate token
    validToken = generateToken(testUser);

    // Create fresh test app for each test
    testApp = createTestApp();
  });

  it('should allow access with valid token', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('userId', testUser._id.toString());
    expect(response.body.user).toHaveProperty('role', 'ADMIN');
  });

  it('should return 401 for missing Authorization header', async () => {
    const response = await request(testApp)
      .get('/protected')
      .expect(401);

    expect(response.body).toHaveProperty('status', 'error');
    expect(response.body).toHaveProperty('message', 'No token provided');
  });

  it('should return 401 for invalid token format', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', 'InvalidFormat token')
      .expect(401);

    expect(response.body).toHaveProperty('status', 'error');
  });

  it('should return 401 for missing token', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer ')
      .expect(401);

    expect(response.body).toHaveProperty('status', 'error');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    expect(response.body).toHaveProperty('status', 'error');
    expect(response.body).toHaveProperty('message', 'Invalid or expired token');
  });

  it('should return 401 for expired token', async () => {
    // Create an expired token (manually signed with past expiry)
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    const expiredToken = jwt.sign(
      { userId: testUser._id.toString(), role: 'ADMIN' },
      config.jwtSecret,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body).toHaveProperty('status', 'error');
    expect(response.body).toHaveProperty('message', 'Invalid or expired token');
  });

  it('should attach user info to request object', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.userId).toBe(testUser._id.toString());
    expect(response.body.user.role).toBe('ADMIN');
  });
});

