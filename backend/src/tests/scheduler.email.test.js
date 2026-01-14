const Schedule = require('../models/Schedule.model');
const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const { processScheduledFollowUps } = require('../workers/scheduler.worker');
const { sendEmail } = require('../services/email.service');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');
const { FREQUENCY_TYPE } = require('../core/scheduleEnums');

// Mock email service
jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn(),
}));

describe('Scheduler Email Integration', () => {
  let testUser;
  let testLead;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'scheduleremail@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'Email Test Lead',
      email: 'emailtest@example.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.NEW,
    });
    await testLead.save();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Email Sending on Follow-up Trigger', () => {
    it('should send email when follow-up triggers', async () => {
      // Mock successful email send
      sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg_123456',
      });

      // Create due schedule
      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      await processScheduledFollowUps();

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith({
        to: testLead.email,
        subject: expect.stringContaining('Follow-up'),
        body: expect.any(String),
        leadId: testLead._id.toString(),
        ownerId: testUser._id.toString(),
      });

      // Verify EMAIL_SENT activity created
      const emailActivities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
      });
      expect(emailActivities).toHaveLength(1);
      expect(emailActivities[0].metadata.messageId).toBe('msg_123456');
      expect(emailActivities[0].ownerAtTime.toString()).toBe(testUser._id.toString());
    });

    it('should log EMAIL_FAILED activity on email failure', async () => {
      // Mock failed email send
      sendEmail.mockResolvedValue({
        success: false,
        error: 'Outlook API error: Rate limit exceeded',
      });

      // Create due schedule
      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      await processScheduledFollowUps();

      // Verify EMAIL_FAILED activity created
      const failedActivities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.EMAIL_FAILED,
      });
      expect(failedActivities).toHaveLength(1);
      expect(failedActivities[0].metadata.errorMessage).toContain('Rate limit');
      expect(failedActivities[0].ownerAtTime.toString()).toBe(testUser._id.toString());
    });

    it('should continue processing even if email fails', async () => {
      // Mock failed email send
      sendEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      // Create due schedule
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

      // Should still process (not crash)
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);

      // Lead status should still be updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.status).toBe(LEAD_STATUS.FOLLOW_UP);
    });

    it('should capture ownerAtTime correctly in email activities', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@test.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });
      await anotherUser.save();

      // Change lead owner before trigger
      testLead.ownerId = anotherUser._id;
      await testLead.save();

      // Mock successful email send
      sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg_123456',
      });

      // Create due schedule
      const pastDate = new Date(Date.now() - 1000);
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: FREQUENCY_TYPE.CUSTOM,
        frequencyValue: 3,
        nextRunAt: pastDate,
        active: true,
      });
      await schedule.save();

      await processScheduledFollowUps();

      // Verify ownerAtTime = current owner (anotherUser)
      const emailActivities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
      });
      expect(emailActivities).toHaveLength(1);
      expect(emailActivities[0].ownerAtTime.toString()).toBe(anotherUser._id.toString());
    });
  });
});

