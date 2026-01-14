const Schedule = require('../models/Schedule.model');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const { FREQUENCY_TYPE } = require('../core/scheduleEnums');

describe('Schedule Model', () => {
  let testUser;
  let testLead;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'schedule@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'Test Lead',
      email: 'test@example.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
    });
    await testLead.save();
  });

  describe('Schema Validation', () => {
    it('should create schedule with all required fields', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: new Date('2024-12-31'),
        active: true,
      });

      const savedSchedule = await schedule.save();

      expect(savedSchedule._id).toBeDefined();
      expect(savedSchedule.leadId.toString()).toBe(testLead._id.toString());
      expect(savedSchedule.frequencyType).toBe(FREQUENCY_TYPE.CUSTOM);
      expect(savedSchedule.frequencyValue).toBe(3);
      expect(savedSchedule.active).toBe(true);
      expect(savedSchedule.createdAt).toBeDefined();
      expect(savedSchedule.updatedAt).toBeDefined();
    });

    it('should require leadId', async () => {
      const schedule = new Schedule({
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        nextRunAt: new Date(),
      });

      await expect(schedule.save()).rejects.toThrow();
    });

    it('should require nextRunAt', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
      });

      await expect(schedule.save()).rejects.toThrow();
    });

    it('should default frequencyType to CUSTOM', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });

      await schedule.save();
      expect(schedule.frequencyType).toBe(FREQUENCY_TYPE.CUSTOM);
    });

    it('should default frequencyValue to 3', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });

      await schedule.save();
      expect(schedule.frequencyValue).toBe(3);
    });

    it('should default active to true', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });

      await schedule.save();
      expect(schedule.active).toBe(true);
    });
  });

  describe('Frequency Types', () => {
    it('should accept DAILY frequency', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.DAILY,
        nextRunAt: new Date(),
      });

      await schedule.save();
      expect(schedule.frequencyType).toBe(FREQUENCY_TYPE.DAILY);
    });

    it('should accept WEEKLY frequency', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.WEEKLY,
        nextRunAt: new Date(),
      });

      await schedule.save();
      expect(schedule.frequencyType).toBe(FREQUENCY_TYPE.WEEKLY);
    });

    it('should accept CUSTOM frequency', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 5,
        nextRunAt: new Date(),
      });

      await schedule.save();
      expect(schedule.frequencyType).toBe(FREQUENCY_TYPE.CUSTOM);
      expect(schedule.frequencyValue).toBe(5);
    });

    it('should reject invalid frequency type', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: 'INVALID_TYPE',
        nextRunAt: new Date(),
      });

      await expect(schedule.save()).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique leadId constraint', async () => {
      const schedule1 = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });
      await schedule1.save();

      const schedule2 = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });

      await expect(schedule2.save()).rejects.toThrow();
    });
  });

  describe('Deletion Prevention', () => {
    it('should prevent schedule deletion via deleteOne', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });
      await schedule.save();

      await expect(schedule.deleteOne()).rejects.toThrow('Schedule deletion is not allowed');
    });

    it('should prevent schedule deletion via findByIdAndDelete', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
      });
      await schedule.save();

      await expect(Schedule.findByIdAndDelete(schedule._id)).rejects.toThrow('Schedule deletion is not allowed');
    });
  });

  describe('Pause/Resume Behavior', () => {
    it('should allow pausing schedule', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
        active: true,
      });
      await schedule.save();

      schedule.active = false;
      await schedule.save();

      expect(schedule.active).toBe(false);
    });

    it('should allow resuming schedule', async () => {
      const schedule = new Schedule({
        leadId: testLead._id,
        nextRunAt: new Date(),
        active: false,
      });
      await schedule.save();

      schedule.active = true;
      await schedule.save();

      expect(schedule.active).toBe(true);
    });
  });
});

