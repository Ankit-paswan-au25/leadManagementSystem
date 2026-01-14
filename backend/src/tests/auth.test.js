const request = require('supertest');
const app = require('../app');
const User = require('../models/User.model');
const { generateToken, verifyToken } = require('../utils/token');

describe('Auth API', () => {
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'testPassword123',
        role: 'USER',
        status: 'ACTIVE',
      });
      await user.save();
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');

      // Verify user data
      const userData = response.body.data.user;
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('name', 'Test User');
      expect(userData).toHaveProperty('email', 'test@example.com');
      expect(userData).toHaveProperty('role', 'USER');
      expect(userData).toHaveProperty('status', 'ACTIVE');
      expect(userData).not.toHaveProperty('passwordHash');

      // Verify token
      const token = response.body.data.token;
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token payload
      const decoded = verifyToken(token);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('role', 'USER');
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
      expect(response.body).not.toHaveProperty('data');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'testPassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should return 403 for disabled user', async () => {
      // Update user status to DISABLED
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { status: 'DISABLED' }
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        })
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Account is not active. Please contact administrator.');
    });

    it('should return 403 for pending user', async () => {
      // Update user status to PENDING
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { status: 'PENDING' }
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        })
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Account is not active. Please contact administrator.');
    });

    it('should handle case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'testPassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return validation error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'testPassword123',
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return validation error for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should generate token with correct expiry (8 hours)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        })
        .expect(200);

      const token = response.body.data.token;
      const decoded = verifyToken(token);

      // Check that token has exp claim (expiry)
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');

      // Verify expiry is approximately 8 hours from now (allow 1 minute tolerance)
      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 8 * 60 * 60; // 8 hours in seconds
      const diff = Math.abs(decoded.exp - expectedExp);
      expect(diff).toBeLessThan(60); // Within 1 minute
    });

    it('should not expose passwordHash in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        })
        .expect(200);

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('passwordHash');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /auth/register', () => {
    beforeEach(async () => {
      // Clean up any existing test users
      await User.deleteMany({ email: { $in: ['newuser@example.com', 'register@test.com'] } });
    });

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');

      // Verify user data
      const userData = response.body.data.user;
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('name', 'New User');
      expect(userData).toHaveProperty('email', 'newuser@example.com');
      expect(userData).toHaveProperty('role', 'USER');
      expect(userData).toHaveProperty('status', 'PENDING');
      expect(userData).not.toHaveProperty('passwordHash');

      // Verify user was saved in database
      const savedUser = await User.findById(userData.id).select('+passwordHash');
      expect(savedUser).toBeTruthy();
      expect(savedUser.name).toBe('New User');
      expect(savedUser.email).toBe('newuser@example.com');
      expect(savedUser.role).toBe('USER');
      expect(savedUser.status).toBe('PENDING');
      // Verify password was hashed
      expect(savedUser.passwordHash).not.toBe('password123');
      expect(savedUser.passwordHash).toMatch(/^\$2b\$/);
    });

    it('should return 409 for duplicate email', async () => {
      // Create existing user
      const existingUser = new User({
        name: 'Existing User',
        email: 'register@test.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });
      await existingUser.save();

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'register@test.com',
          password: 'password123',
        })
        .expect(409);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'User with this email already exists');
    });

    it('should return validation error for missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('name', 'Name is required');
    });

    it('should return validation error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          password: 'password123',
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email', 'Email is required');
    });

    it('should return validation error for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('password', 'Password is required');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email');
    });

    it('should return validation error for password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: '12345', // Less than 6 characters
        })
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('password', 'Password must be at least 6 characters long');
    });

    it('should handle case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'NEWUSER@EXAMPLE.COM',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    it('should trim name and email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: '  New User  ',
          email: '  newuser@example.com  ',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.data.user.name).toBe('New User');
      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    it('should not return token on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.data).not.toHaveProperty('token');
    });

    it('should set default role to USER', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.data.user.role).toBe('USER');
    });

    it('should set default status to PENDING', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.data.user.status).toBe('PENDING');
    });

    it('should hash password before saving', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201);

      const savedUser = await User.findById(response.body.data.user.id).select('+passwordHash');
      expect(savedUser.passwordHash).not.toBe('password123');
      expect(savedUser.passwordHash).toMatch(/^\$2b\$/); // bcrypt hash format
      
      // Verify password can be compared
      const isPasswordValid = await savedUser.comparePassword('password123');
      expect(isPasswordValid).toBe(true);
    });
  });
});

