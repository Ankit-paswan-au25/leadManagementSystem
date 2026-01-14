const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const { LEAD_STATUS, LEAD_SOURCE } = require('../core/leadEnums');

describe('Lead Model', () => {
  let testUser;
  let testCreator;

  beforeEach(async () => {
    // Create test users
    testUser = new User({
      name: 'Test Owner',
      email: 'owner@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    testCreator = new User({
      name: 'Test Creator',
      email: 'creator@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testCreator.save();
  });

  describe('Schema Validation', () => {
    it('should create lead with all required fields', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();

      expect(savedLead._id).toBeDefined();
      expect(savedLead.leadName).toBe('John Doe');
      expect(savedLead.email).toBe('john@example.com');
      expect(savedLead.ownerId.toString()).toBe(testUser._id.toString());
      expect(savedLead.createdBy.toString()).toBe(testCreator._id.toString());
      expect(savedLead.status).toBe(LEAD_STATUS.NEW);
      expect(savedLead.source).toBe(LEAD_SOURCE.MANUAL);
      expect(savedLead.createdAt).toBeDefined();
      expect(savedLead.updatedAt).toBeDefined();
    });

    it('should require leadName', async () => {
      const lead = new Lead({
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await expect(lead.save()).rejects.toThrow();
    });

    it('should require email', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await expect(lead.save()).rejects.toThrow();
    });

    it('should require valid email format', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'invalid-email',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await expect(lead.save()).rejects.toThrow();
    });

    it('should require ownerId', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        createdBy: testCreator._id,
      });

      await expect(lead.save()).rejects.toThrow();
    });

    it('should require createdBy', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
      });

      await expect(lead.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();
      expect(lead.email).toBe('john@example.com');
    });

    it('should trim whitespace from string fields', async () => {
      const lead = new Lead({
        leadName: '  John Doe  ',
        companyName: '  Acme Corp  ',
        email: '  john@example.com  ',
        phone: '  1234567890  ',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();
      expect(lead.leadName).toBe('John Doe');
      expect(lead.companyName).toBe('Acme Corp');
      expect(lead.email).toBe('john@example.com');
      expect(lead.phone).toBe('1234567890');
    });
  });

  describe('Status and Source Enums', () => {
    it('should default status to NEW', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();
      expect(lead.status).toBe(LEAD_STATUS.NEW);
    });

    it('should default source to MANUAL', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();
      expect(lead.source).toBe(LEAD_SOURCE.MANUAL);
    });

    it('should accept valid status values', async () => {
      const statuses = Object.values(LEAD_STATUS);

      for (const status of statuses) {
        const lead = new Lead({
          leadName: 'John Doe',
          email: `john${status}@example.com`,
          ownerId: testUser._id,
          createdBy: testCreator._id,
          status,
        });

        const savedLead = await lead.save();
        expect(savedLead.status).toBe(status);
      }
    });

    it('should accept valid source values', async () => {
      const sources = Object.values(LEAD_SOURCE);

      for (const source of sources) {
        const lead = new Lead({
          leadName: 'John Doe',
          email: `john${source}@example.com`,
          ownerId: testUser._id,
          createdBy: testCreator._id,
          source,
        });

        const savedLead = await lead.save();
        expect(savedLead.source).toBe(source);
      }
    });

    it('should reject invalid status', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
        status: 'INVALID_STATUS',
      });

      await expect(lead.save()).rejects.toThrow();
    });

    it('should reject invalid source', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
        source: 'INVALID_SOURCE',
      });

      await expect(lead.save()).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should allow lead without companyName', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();
      expect(savedLead.companyName).toBeUndefined();
    });

    it('should allow lead without phone', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();
      expect(savedLead.phone).toBeUndefined();
    });

    it('should allow lead with all optional fields', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        companyName: 'Acme Corp',
        email: 'john@example.com',
        phone: '1234567890',
        ownerId: testUser._id,
        createdBy: testCreator._id,
        nextFollowUpAt: new Date('2024-12-31'),
        lastContactedAt: new Date('2024-01-01'),
      });

      const savedLead = await lead.save();
      expect(savedLead.companyName).toBe('Acme Corp');
      expect(savedLead.phone).toBe('1234567890');
      expect(savedLead.nextFollowUpAt).toBeDefined();
      expect(savedLead.lastContactedAt).toBeDefined();
    });
  });

  describe('Scheduling Fields', () => {
    it('should allow nextFollowUpAt date', async () => {
      const futureDate = new Date('2024-12-31');
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
        nextFollowUpAt: futureDate,
      });

      const savedLead = await lead.save();
      expect(savedLead.nextFollowUpAt.getTime()).toBe(futureDate.getTime());
    });

    it('should allow frequencyRule object', async () => {
      const rule = {
        interval: 'weekly',
        day: 'monday',
        time: '10:00',
      };

      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
        frequencyRule: rule,
      });

      const savedLead = await lead.save();
      expect(savedLead.frequencyRule).toEqual(rule);
    });
  });

  describe('Deletion Prevention', () => {
    it('should prevent lead deletion via deleteOne', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();

      await expect(lead.deleteOne()).rejects.toThrow('Lead deletion is not allowed');
    });

    it('should prevent lead deletion via findByIdAndDelete', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();

      await expect(Lead.findByIdAndDelete(lead._id)).rejects.toThrow('Lead deletion is not allowed');
    });

    it('should prevent lead deletion via findOneAndDelete', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      await lead.save();

      await expect(Lead.findOneAndDelete({ _id: lead._id })).rejects.toThrow('Lead deletion is not allowed');
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt on creation', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();
      expect(savedLead.createdAt).toBeDefined();
      expect(savedLead.updatedAt).toBeDefined();
      expect(savedLead.createdAt.getTime()).toBe(savedLead.updatedAt.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();
      const originalUpdatedAt = savedLead.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedLead.leadName = 'Jane Doe';
      await savedLead.save();

      expect(savedLead.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('References', () => {
    it('should reference valid User for ownerId', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();
      expect(savedLead.ownerId.toString()).toBe(testUser._id.toString());
    });

    it('should reference valid User for createdBy', async () => {
      const lead = new Lead({
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: testUser._id,
        createdBy: testCreator._id,
      });

      const savedLead = await lead.save();
      expect(savedLead.createdBy.toString()).toBe(testCreator._id.toString());
    });
  });
});

