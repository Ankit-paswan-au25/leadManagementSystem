const Lead = require('../models/Lead.model');
const Schedule = require('../models/Schedule.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const { processEmailReplies } = require('../workers/replyDetector.worker');
const { fetchUnreadEmails, markEmailAsRead } = require('../services/outlook.service');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');

// Mock Outlook service
jest.mock('../services/outlook.service', () => ({
  fetchUnreadEmails: jest.fn(),
  markEmailAsRead: jest.fn(),
}));

describe('Reply Detector Worker', () => {
  let testUser;
  let testLead;
  let anotherLead;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'replytest@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test leads
    testLead = new Lead({
      leadName: 'Test Lead',
      email: 'client@example.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.FOLLOW_UP,
    });
    await testLead.save();

    anotherLead = new Lead({
      leadName: 'Another Lead',
      email: 'another@example.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.NEW,
    });
    await anotherLead.save();

    // Reset mocks
    jest.clearAllMocks();
    markEmailAsRead.mockResolvedValue(true);
  });

  describe('Reply Detection', () => {
    it('should detect reply and update lead status', async () => {
      // Mock unread emails
      const mockEmails = [
        {
          id: 'msg_123',
          from: { emailAddress: { address: 'client@example.com' } },
          subject: 'Re: Follow-up',
          body: 'Thank you for your email',
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await processEmailReplies();

      expect(result.matched).toBe(1);
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);

      // Verify lead status updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.status).toBe(LEAD_STATUS.REPLIED);
      expect(updatedLead.lastContactedAt).toBeDefined();

      // Verify CLIENT_REPLIED activity created
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(testUser._id.toString());
      expect(activities[0].metadata.messageId).toBe('msg_123');

      // Verify email marked as read
      expect(markEmailAsRead).toHaveBeenCalledWith('msg_123');
    });

    it('should pause schedule when reply detected', async () => {
      // Create active schedule for the lead
      const Schedule = require('../models/Schedule.model');
      const schedule = new Schedule({
        leadId: testLead._id,
        frequencyType: 'CUSTOM',
        frequencyValue: 3,
        nextRunAt: new Date(Date.now() + 86400000),
        active: true,
      });
      await schedule.save();

      // Mock unread emails
      const mockEmails = [
        {
          id: 'msg_123',
          from: { emailAddress: { address: 'client@example.com' } },
          subject: 'Re: Follow-up',
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      await processEmailReplies();

      // Verify schedule is paused
      const updatedSchedule = await Schedule.findById(schedule._id);
      expect(updatedSchedule.active).toBe(false);

      // Verify SCHEDULE_PAUSED activity created
      const pauseActivities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
      });
      expect(pauseActivities.length).toBeGreaterThan(0);
    });

    it('should ignore non-matching emails', async () => {
      // Mock unread emails from unknown sender
      const mockEmails = [
        {
          id: 'msg_123',
          from: { emailAddress: { address: 'unknown@example.com' } },
          subject: 'Test',
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await processEmailReplies();

      expect(result.matched).toBe(0);
      expect(result.processed).toBe(0);

      // Verify no activities created
      const activities = await LeadActivity.find({
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
      });
      expect(activities).toHaveLength(0);
    });

    it('should ignore duplicate replies (idempotent)', async () => {
      // Create existing CLIENT_REPLIED activity
      await LeadActivity.create({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        metadata: {
          messageId: 'msg_123',
        },
      });

      // Mock same email again
      const mockEmails = [
        {
          id: 'msg_123',
          from: { emailAddress: { address: 'client@example.com' } },
          subject: 'Re: Follow-up',
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await processEmailReplies();

      // Should not create duplicate activity
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
        'metadata.messageId': 'msg_123',
      });
      expect(activities).toHaveLength(1);

      // Email should still be marked as read
      expect(markEmailAsRead).toHaveBeenCalledWith('msg_123');
    });

    it('should handle multiple replies correctly', async () => {
      // Create another lead
      const lead2 = new Lead({
        leadName: 'Lead 2',
        email: 'client2@example.com',
        ownerId: testUser._id,
        createdBy: testUser._id,
        status: LEAD_STATUS.FOLLOW_UP,
      });
      await lead2.save();

      // Mock multiple emails
      const mockEmails = [
        {
          id: 'msg_1',
          from: { emailAddress: { address: 'client@example.com' } },
          subject: 'Re: Follow-up 1',
        },
        {
          id: 'msg_2',
          from: { emailAddress: { address: 'client2@example.com' } },
          subject: 'Re: Follow-up 2',
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await processEmailReplies();

      expect(result.matched).toBe(2);
      expect(result.processed).toBe(2);

      // Verify both leads updated
      const updatedLead1 = await Lead.findById(testLead._id);
      const updatedLead2 = await Lead.findById(lead2._id);
      expect(updatedLead1.status).toBe(LEAD_STATUS.REPLIED);
      expect(updatedLead2.status).toBe(LEAD_STATUS.REPLIED);
    });

    it('should capture ownerAtTime correctly (owner-aware)', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@test.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });
      await anotherUser.save();

      // Change lead owner
      testLead.ownerId = anotherUser._id;
      await testLead.save();

      // Mock email
      const mockEmails = [
        {
          id: 'msg_123',
          from: { emailAddress: { address: 'client@example.com' } },
          subject: 'Re: Follow-up',
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      await processEmailReplies();

      // Verify ownerAtTime = current owner (anotherUser)
      const activities = await LeadActivity.find({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(anotherUser._id.toString());
    });

    it('should handle email fetch errors gracefully', async () => {
      fetchUnreadEmails.mockRejectedValue(new Error('Outlook API error'));

      const result = await processEmailReplies();

      expect(result.errors).toBe(1);
      expect(result.processed).toBe(0);
      expect(result.matched).toBe(0);
    });

    it('should handle individual email processing errors', async () => {
      // Mock emails with invalid format
      const mockEmails = [
        {
          id: 'msg_123',
          // Missing from field
        },
      ];
      fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await processEmailReplies();

      // Should continue processing (no crash)
      expect(result.errors).toBe(0);
      expect(result.processed).toBe(0);
    });
  });
});

