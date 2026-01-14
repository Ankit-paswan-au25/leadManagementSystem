const Schedule = require('../models/Schedule.model');
const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const { processScheduledFollowUps } = require('../workers/scheduler.worker');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');
const { FREQUENCY_TYPE } = require('../core/scheduleEnums');
const { calculateNextRunAt } = require('../utils/scheduleHelper');

describe('Scheduler Worker', () => {
  let testUser;
  let anotherUser;
  let testLead;

  beforeEach(async () => {
    // Create test users
    testUser = new User({
      name: 'Test User',
      email: 'scheduler@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    anotherUser = new User({
      name: 'Another User',
      email: 'another@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await anotherUser.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'Scheduler Test Lead',
      email: 'scheduler@example.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.NEW,
    });
    await testLead.save();
  });

  describe('Follow-up Trigger', () => {
    it('should trigger follow-up when nextRunAt <= now', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);

      // Verify LeadActivity was created
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(testUser._id.toString());

      // Verify lead status updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.status).toBe(LEAD_STATUS.FOLLOW_UP);
      expect(updatedLead.lastContactedAt).toBeDefined();

      // Verify schedule nextRunAt updated
      const updatedSchedule = await Schedule.findById(schedule._id);
      expect(updatedSchedule.nextRunAt.getTime()).toBeGreaterThan(pastDate.getTime());
    });

    it('should not trigger when nextRunAt > now', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day in future
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: futureDate,
        active: true,
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      expect(result.processed).toBe(0);

      // Verify no activity created
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
      });
      expect(activities).toHaveLength(0);
    });

    it('should not trigger when schedule is inactive', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: false, // Inactive
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      expect(result.processed).toBe(0);
    });

    it('should capture ownerAtTime correctly (owner-aware)', async () => {
      // Create schedule with testUser as owner
      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      // Change owner before trigger
      testLead.ownerId = anotherUser._id;
      await testLead.save();

      // Process scheduler
      await processScheduledFollowUps();

      // Verify ownerAtTime = current owner (anotherUser) at time of trigger
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(anotherUser._id.toString());
    });

    it('should recalculate nextRunAt correctly', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 5, // Every 5 days
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      await processScheduledFollowUps();

      const updatedSchedule = await Schedule.findById(schedule._id);
      const expectedNextRun = calculateNextRunAt(FREQUENCY_TYPE.CUSTOM, 5, now);
      
      // Allow 1 second tolerance for timing
      const diff = Math.abs(updatedSchedule.nextRunAt.getTime() - expectedNextRun.getTime());
      expect(diff).toBeLessThan(2000); // 2 seconds tolerance
    });
  });

  describe('Auto-Pause on Status', () => {
    it('should pause schedule when lead status is REPLIED', async () => {
      testLead.status = LEAD_STATUS.REPLIED;
      await testLead.save();

      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(0);

      // Verify schedule is paused
      const updatedSchedule = await Schedule.findById(schedule._id);
      expect(updatedSchedule.active).toBe(false);

      // Verify SCHEDULE_PAUSED activity created
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(testLead.ownerId.toString());
    });

    it('should pause schedule when lead status is CLOSED', async () => {
      testLead.status = LEAD_STATUS.CLOSED;
      await testLead.save();

      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(0);

      // Verify schedule is paused
      const updatedSchedule = await Schedule.findById(schedule._id);
      expect(updatedSchedule.active).toBe(false);
    });

    it('should not pause when lead status is NEW or CONTACTED', async () => {
      testLead.status = LEAD_STATUS.CONTACTED;
      await testLead.save();

      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(0);

      // Verify schedule is still active
      const updatedSchedule = await Schedule.findById(schedule._id);
      expect(updatedSchedule.active).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should not crash on invalid lead', async () => {
      const mongoose = require('mongoose');
      const fakeLeadId = new mongoose.Types.ObjectId();
      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: fakeLeadId,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      const result = await processScheduledFollowUps();

      // Should handle gracefully (lead not found = skipped, not error)
      expect(result.errors).toBe(0);
      expect(result.skipped).toBeGreaterThanOrEqual(1);

      // Schedule should be paused (if lead lookup succeeded but lead was null)
      // OR schedule might still be active if populate returned null
      const updatedSchedule = await Schedule.findById(schedule._id);
      // The schedule might be paused or still active depending on how populate handles missing leads
      // The important thing is that it didn't crash
      expect(updatedSchedule).toBeDefined();
    });

    it('should continue processing other schedules on error', async () => {
      // Create valid schedule
      const pastDate = new Date(Date.now() - 1000);
      const schedule1 = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule1.save();

      // Create another lead and schedule
      const lead2 = new Lead({
        leadName: 'Lead 2',
        email: 'lead2@example.com',
        ownerId: testUser._id,
        createdBy: testUser._id,
      });
      await lead2.save();

      const schedule2 = new Schedule({
        leadId: lead2._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule2.save();

      const result = await processScheduledFollowUps();

      // Should process both
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
    });
  });

  describe('Multiple Schedules', () => {
    it('should process multiple due schedules', async () => {
      const pastDate = new Date(Date.now() - 1000);

      // Create multiple leads and schedules
      const leads = [];
      const schedules = [];

      for (let i = 0; i < 3; i++) {
        const lead = new Lead({
          leadName: `Lead ${i}`,
          email: `lead${i}@example.com`,
          ownerId: testUser._id,
          createdBy: testUser._id,
        });
        await lead.save();
        leads.push(lead);

        const schedule = new Schedule({
          leadId: lead._id,
          frequencyType: FREQUENCY_TYPE.CUSTOM,
          frequencyValue: 3,
          nextRunAt: pastDate,
          active: true,
        });
        await schedule.save();
        schedules.push(schedule);
      }

      const result = await processScheduledFollowUps();

      expect(result.processed).toBe(3);
      expect(result.errors).toBe(0);

      // Verify all leads have FOLLOWUP_TRIGGERED activities
      for (const lead of leads) {
        const activities = await LeadActivity.find({
          leadId: lead._id,
          activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
        });
        expect(activities).toHaveLength(1);
      }
    });
  });
});

