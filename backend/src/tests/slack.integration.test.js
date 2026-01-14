const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const { createLeadActivity } = require('../utils/leadActivityHelper');
const { sendSlackNotification } = require('../services/slack.service');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const { LEAD_STATUS } = require('../core/leadEnums');
const config = require('../config/env');

// Mock Slack service
jest.mock('../services/slack.service', () => ({
  sendSlackNotification: jest.fn(),
  formatActivityMessage: jest.requireActual('../services/slack.service').formatActivityMessage,
  resolveNotificationTargets: jest.requireActual('../services/slack.service').resolveNotificationTargets,
}));

describe('Slack Integration Tests', () => {
  let testUser;
  let testLead;

  beforeEach(async () => {
    // Set up Slack config
    config.slackWebhookUrl = 'https://hooks.slack.com/test';
    config.slackAdminChannel = '#admin';

    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'slacktest@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.NEW,
    });
    await testLead.save();

    // Reset mocks
    jest.clearAllMocks();
    sendSlackNotification.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    config.slackWebhookUrl = '';
  });

  describe('Activity Creation Triggers Slack', () => {
    it('should trigger Slack notification for EMAIL_SENT', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
        metadata: {
          messageId: 'msg_123',
          subject: 'Test Subject',
        },
      });

      // Verify Slack was called
      expect(sendSlackNotification).toHaveBeenCalled();
      const callArgs = sendSlackNotification.mock.calls[0][0];
      expect(callArgs.target).toBe(`@${testUser._id}`);
      expect(callArgs.message).toContain('Acme Corp');
      expect(callArgs.message).toContain('John Doe');
    });

    it('should trigger Slack notification for CLIENT_REPLIED', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
        metadata: {
          messageId: 'msg_123',
        },
      });

      expect(sendSlackNotification).toHaveBeenCalled();
      const callArgs = sendSlackNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('✅');
      expect(callArgs.message).toContain('Acme Corp');
    });

    it('should trigger Slack notification for FOLLOWUP_TRIGGERED', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
        metadata: {
          frequencyType: 'CUSTOM',
          frequencyValue: 3,
        },
      });

      expect(sendSlackNotification).toHaveBeenCalled();
      const callArgs = sendSlackNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('⏰');
    });

    it('should trigger Slack notification for OWNER_CHANGE_REQUESTED to admin channel', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
        metadata: {
          requestedOwnerId: 'user456',
        },
      });

      expect(sendSlackNotification).toHaveBeenCalled();
      const callArgs = sendSlackNotification.mock.calls[0][0];
      expect(callArgs.target).toBe('#admin');
      expect(callArgs.message).toContain('📋');
    });

    it('should trigger Slack notification for OWNER_CHANGED to both owners', async () => {
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@test.com',
        passwordHash: 'password123',
        role: 'USER',
        status: 'ACTIVE',
      });
      await anotherUser.save();

      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
        oldOwnerId: testUser._id.toString(),
        newOwnerId: anotherUser._id.toString(),
        metadata: {
          oldOwnerId: testUser._id.toString(),
          newOwnerId: anotherUser._id.toString(),
        },
      });

      // Should be called for both old and new owner
      expect(sendSlackNotification).toHaveBeenCalledTimes(2);
      const targets = sendSlackNotification.mock.calls.map(call => call[0].target);
      expect(targets).toContain(`@${testUser._id}`);
      expect(targets).toContain(`@${anotherUser._id}`);
    });

    it('should trigger Slack notification for SCHEDULE_PAUSED', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
        metadata: {
          reason: 'Client replied',
        },
      });

      expect(sendSlackNotification).toHaveBeenCalled();
      const callArgs = sendSlackNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('⏸️');
      expect(callArgs.message).toContain('Reason: Client replied');
    });

    it('should NOT trigger Slack for non-notifiable activities', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.CREATED,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
      });

      expect(sendSlackNotification).not.toHaveBeenCalled();
    });

    it('should continue main flow even if Slack fails', async () => {
      sendSlackNotification.mockRejectedValue(new Error('Slack API error'));

      // Should not throw
      const activity = await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        lead: testLead,
      });

      expect(activity).toBeDefined();
      expect(activity.activityType).toBe(ACTIVITY_TYPE.EMAIL_SENT);

      // Verify activity was saved
      const savedActivity = await LeadActivity.findById(activity._id);
      expect(savedActivity).toBeDefined();
    });

    it('should fetch lead if not provided', async () => {
      await createLeadActivity({
        leadId: testLead._id,
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        performedBy: testUser._id,
        ownerAtTime: testUser._id,
        // lead not provided
      });

      expect(sendSlackNotification).toHaveBeenCalled();
      const callArgs = sendSlackNotification.mock.calls[0][0];
      expect(callArgs.message).toContain('Acme Corp');
    });
  });
});

