const User = require('../models/User.model');

describe('User Model', () => {
  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'testPassword123';
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: plainPassword,
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();

      // Password should be hashed (bcrypt hashes start with $2b$)
      expect(user.passwordHash).not.toBe(plainPassword);
      expect(user.passwordHash).toMatch(/^\$2b\$/);
      expect(user.passwordHash.length).toBeGreaterThan(50);
    });

    it('should not hash password if already hashed', async () => {
      const existingHash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuv';
      const user = new User({
        name: 'Test User',
        email: 'test2@example.com',
        passwordHash: existingHash,
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();

      // Password should remain the same (not double-hashed)
      expect(user.passwordHash).toBe(existingHash);
    });

    it('should not rehash password on update if not modified', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test3@example.com',
        passwordHash: 'plainPassword',
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();
      const originalHash = user.passwordHash;

      // Update name (not passwordHash)
      user.name = 'Updated Name';
      await user.save();

      // Password hash should remain the same
      expect(user.passwordHash).toBe(originalHash);
    });
  });

  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'correctPassword123';
      const user = new User({
        name: 'Test User',
        email: 'test4@example.com',
        passwordHash: plainPassword,
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const plainPassword = 'correctPassword123';
      const user = new User({
        name: 'Test User',
        email: 'test5@example.com',
        passwordHash: plainPassword,
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();

      const isMatch = await user.comparePassword('wrongPassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('User Schema Validation', () => {
    it('should create user with all required fields', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test6@example.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });

      const savedUser = await user.save();
      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe('Test User');
      expect(savedUser.email).toBe('test6@example.com');
      expect(savedUser.role).toBe('USER');
      expect(savedUser.status).toBe('ACTIVE');
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should enforce email uniqueness', async () => {
      const user1 = new User({
        name: 'User 1',
        email: 'duplicate@example.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });

      await user1.save();

      const user2 = new User({
        name: 'User 2',
        email: 'duplicate@example.com',
        passwordHash: 'password456',
        role: 'USER',
        status: 'ACTIVE',
      });

      await expect(user2.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const user = new User({
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();
      expect(user.email).toBe('test@example.com');
    });

    it('should enforce role enum values', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test7@example.com',
        passwordHash: 'password123',
        role: 'INVALID_ROLE',
        status: 'ACTIVE',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce status enum values', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test8@example.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'INVALID_STATUS',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should default role to USER if not provided', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test9@example.com',
        passwordHash: 'password123',
        status: 'ACTIVE',
      });

      await user.save();
      expect(user.role).toBe('USER');
    });

    it('should default status to PENDING if not provided', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test10@example.com',
        passwordHash: 'password123',
        role: 'USER',
      });

      await user.save();
      expect(user.status).toBe('PENDING');
    });
  });

  describe('Password Hash Exclusion', () => {
    it('should not include passwordHash in default queries', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test11@example.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();

      const foundUser = await User.findOne({ email: 'test11@example.com' });
      expect(foundUser.passwordHash).toBeUndefined();
    });

    it('should include passwordHash when explicitly selected', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test12@example.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });

      await user.save();

      const foundUser = await User.findOne({ email: 'test12@example.com' }).select('+passwordHash');
      expect(foundUser.passwordHash).toBeDefined();
    });
  });
});

