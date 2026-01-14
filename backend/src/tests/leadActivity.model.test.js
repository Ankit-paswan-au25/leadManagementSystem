const LeadActivity = require('../models/LeadActivity.model');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const { ACTIVITY_TYPE } = require('../core/leadEnums');

describe('LeadActivity Model', () => {
  let testUser;
  let testOwner;
  let testLead;

  beforeEach(async () => {
    // Create test users
    testUser = new User({
      name: 'Test User',
      email: 'user@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    testOwner = new User({
      name: 'Test Owner',
      email: 'owner@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testOwner.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'John Doe',
      email: 'john@example.com',
      ownerId: testOwner._id,
      createdBy: testUser._id,
    });
    await testLead.save();
  });

  describe('Schema Validation', () => {
    it('should create activity with all required fields', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();

      expect(savedActivity._id).toBeDefined();
      expect(savedActivity.leadId.toString()).toBe(testLead._id.toString());
      expect(savedActivity.activityType).toBe(ACTIVITY_TYPE.CREATED);
      expect(savedActivity.performedBy.toString()).toBe(testUser._id.toString());
      expect(savedActivity.ownerAtTime.toString()).toBe(testOwner._id.toString());
      expect(savedActivity.timestamp).toBeDefined();
      expect(savedActivity.metadata).toEqual({});
    });

    it('should require leadId', async () => {
      const activity = new LeadActivity({
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await expect(activity.save()).rejects.toThrow();
    });

    it('should require activityType', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await expect(activity.save()).rejects.toThrow();
    });

    it('should require performedBy', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        ownerAtTime: testOwner._id,
      });

      await expect(activity.save()).rejects.toThrow();
    });

    it('should require ownerAtTime', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
      });

      await expect(activity.save()).rejects.toThrow();
    });

    it('should accept valid activity types', async () => {
      const activityTypes = Object.values(ACTIVITY_TYPE);

      for (const activityType of activityTypes) {
        const activity = new LeadActivity({
          leadId: testLead._id,
          activityType,
          performedBy: testUser._id,
          ownerAtTime: testOwner._id,
        });

        const savedActivity = await activity.save();
        expect(savedActivity.activityType).toBe(activityType);
      }
    });

    it('should reject invalid activity type', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: 'INVALID_TYPE',
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await expect(activity.save()).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should allow activity without description', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.description).toBeUndefined();
    });

    it('should allow activity with description', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.NOTE_ADDED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
        description: 'This is a test note',
      });

      const savedActivity = await activity.save();
      expect(savedActivity.description).toBe('This is a test note');
    });

    it('should allow activity with metadata', async () => {
      const metadata = {
        oldStatus: 'NEW',
        newStatus: 'CONTACTED',
        reason: 'Initial contact made',
      };

      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.STATUS_CHANGED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
        metadata,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.metadata).toEqual(metadata);
    });

    it('should default metadata to empty object', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.metadata).toEqual({});
    });
  });

  describe('Timestamp', () => {
    it('should set timestamp automatically on creation', async () => {
      const beforeCreation = new Date();
      
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();
      const afterCreation = new Date();

      expect(savedActivity.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(savedActivity.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should allow custom timestamp', async () => {
      const customTimestamp = new Date('2024-01-01T10:00:00Z');

      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
        timestamp: customTimestamp,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.timestamp.getTime()).toBe(customTimestamp.getTime());
    });
  });

  describe('Immutability', () => {
    it('should prevent updates to existing activity', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await activity.save();

      activity.description = 'Updated description';
      await expect(activity.save()).rejects.toThrow('LeadActivity records are immutable');
    });

    it('should prevent findOneAndUpdate', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await activity.save();

      await expect(
        LeadActivity.findOneAndUpdate(
          { _id: activity._id },
          { description: 'Updated' }
        )
      ).rejects.toThrow('LeadActivity records are immutable');
    });

    it('should prevent deletion via deleteOne', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await activity.save();

      await expect(activity.deleteOne()).rejects.toThrow('LeadActivity records are immutable');
    });

    it('should prevent deletion via findByIdAndDelete', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await activity.save();

      await expect(LeadActivity.findByIdAndDelete(activity._id)).rejects.toThrow('LeadActivity records are immutable');
    });

    it('should prevent deletion via deleteOne', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      await activity.save();

      await expect(LeadActivity.deleteOne({ _id: activity._id })).rejects.toThrow('LeadActivity records are immutable');
    });
  });

  describe('References', () => {
    it('should reference valid Lead for leadId', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.leadId.toString()).toBe(testLead._id.toString());
    });

    it('should reference valid User for performedBy', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.performedBy.toString()).toBe(testUser._id.toString());
    });

    it('should reference valid User for ownerAtTime', async () => {
      const activity = new LeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testOwner._id,
      });

      const savedActivity = await activity.save();
      expect(savedActivity.ownerAtTime.toString()).toBe(testOwner._id.toString());
    });
  });

  describe('Activity Types', () => {
    it('should store different activity types correctly', async () => {
      const activities = [
        { type: ACTIVITY_TYPE.CREATED, metadata: {} },
        { type: ACTIVITY_TYPE.STATUS_CHANGED, metadata: { oldStatus: 'NEW', newStatus: 'CONTACTED' } },
        { type: ACTIVITY_TYPE.OWNER_CHANGED, metadata: { oldOwner: testOwner._id, newOwner: testUser._id } },
        { type: ACTIVITY_TYPE.NOTE_ADDED, description: 'Test note' },
      ];

      for (const activityData of activities) {
        const activity = new LeadActivity({
          leadId: testLead._id,
          activityType: activityData.type,
          performedBy: testUser._id,
          ownerAtTime: testOwner._id,
          metadata: activityData.metadata || {},
          description: activityData.description,
        });

        const savedActivity = await activity.save();
        expect(savedActivity.activityType).toBe(activityData.type);
        if (activityData.metadata) {
          expect(savedActivity.metadata).toEqual(activityData.metadata);
        }
        if (activityData.description) {
          expect(savedActivity.description).toBe(activityData.description);
        }
      }
    });
  });
});

