const { sendSlackNotification, formatActivityMessage, resolveNotificationTargets } = require('../services/slack.service');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const config = require('../config/env');

describe('Slack Service', () => {
  beforeEach(() => {
    // Set up Slack config for tests
    config.slackWebhookUrl = 'https://hooks.slack.com/test';
    config.slackAdminChannel = '#admin';
  });

  afterEach(() => {
    // Clean up
    config.slackWebhookUrl = '';
    config.slackBotToken = '';
  });

  describe('sendSlackNotification', () => {
    it('should send Slack notification successfully', async () => {
      const result = await sendSlackNotification({
        target: '@user123',
        message: 'Test message',
        metadata: { leadId: 'lead123' },
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing Slack configuration gracefully', async () => {
      config.slackWebhookUrl = '';
      config.slackBotToken = '';

      const result = await sendSlackNotification({
        target: '@user123',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack not configured');
    });

    it('should validate required parameters', async () => {
      const result1 = await sendSlackNotification({
        target: '',
        message: 'Test message',
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Missing required');

      const result2 = await sendSlackNotification({
        target: '@user123',
        message: '',
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Missing required');
    });

    it('should format message with metadata', async () => {
      const result = await sendSlackNotification({
        target: '@user123',
        message: 'Test message',
        metadata: {
          leadId: 'lead123',
          timestamp: new Date('2024-01-01'),
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('formatActivityMessage', () => {
    const mockLead = {
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      ownerId: 'user123',
    };

    it('should format EMAIL_SENT message', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        lead: mockLead,
      });

      expect(message).toContain('📩');
      expect(message).toContain('Acme Corp');
      expect(message).toContain('John Doe');
    });

    it('should format CLIENT_REPLIED message', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
        lead: mockLead,
      });

      expect(message).toContain('✅');
      expect(message).toContain('Acme Corp');
    });

    it('should format FOLLOWUP_TRIGGERED message', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
        lead: mockLead,
      });

      expect(message).toContain('⏰');
      expect(message).toContain('Acme Corp');
    });

    it('should format OWNER_CHANGED message', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.OWNER_CHANGED,
        lead: mockLead,
      });

      expect(message).toContain('🔄');
      expect(message).toContain('Acme Corp');
    });

    it('should format OWNER_CHANGE_REQUESTED message', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        lead: mockLead,
      });

      expect(message).toContain('📋');
      expect(message).toContain('Acme Corp');
    });

    it('should format SCHEDULE_PAUSED message', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
        lead: mockLead,
        metadata: { reason: 'Client replied' },
      });

      expect(message).toContain('⏸️');
      expect(message).toContain('Acme Corp');
      expect(message).toContain('Reason: Client replied');
    });

    it('should handle missing lead data gracefully', () => {
      const message = formatActivityMessage({
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        lead: null,
      });

      expect(message).toContain('Unknown Lead');
      expect(message).toContain('Unknown Company');
    });

    it('should handle unknown activity type', () => {
      const message = formatActivityMessage({
        activityType: 'UNKNOWN_TYPE',
        lead: mockLead,
      });

      expect(message).toContain('📌');
      expect(message).toContain('UNKNOWN_TYPE');
    });
  });

  describe('resolveNotificationTargets', () => {
    const mockLead = {
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      ownerId: 'user123',
    };

    it('should return admin channel for OWNER_CHANGE_REQUESTED', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        lead: mockLead,
      });

      expect(targets).toEqual(['#admin']);
    });

    it('should return both old and new owner for OWNER_CHANGED', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.OWNER_CHANGED,
        lead: mockLead,
        oldOwnerId: 'user123',
        newOwnerId: 'user456',
      });

      expect(targets).toContain('@user123');
      expect(targets).toContain('@user456');
      expect(targets.length).toBe(2);
    });

    it('should return current owner for default activities', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        lead: mockLead,
      });

      expect(targets).toEqual(['@user123']);
    });

    it('should return current owner for CLIENT_REPLIED', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
        lead: mockLead,
      });

      expect(targets).toEqual(['@user123']);
    });

    it('should return current owner for FOLLOWUP_TRIGGERED', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
        lead: mockLead,
      });

      expect(targets).toEqual(['@user123']);
    });

    it('should return current owner for SCHEDULE_PAUSED', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
        lead: mockLead,
      });

      expect(targets).toEqual(['@user123']);
    });

    it('should handle missing lead gracefully', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.EMAIL_SENT,
        lead: null,
      });

      expect(targets).toEqual([]);
    });

    it('should handle OWNER_CHANGED with only new owner', () => {
      const targets = resolveNotificationTargets({
        activityType: ACTIVITY_TYPE.OWNER_CHANGED,
        lead: mockLead,
        newOwnerId: 'user456',
      });

      expect(targets).toContain('@user456');
    });
  });
});

