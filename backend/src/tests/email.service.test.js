const { sendEmail } = require('../services/email.service');
const config = require('../config/env');

describe('Email Service', () => {
  // Set up Outlook config for tests (if not already set)
  beforeAll(() => {
    if (!config.outlookClientId) {
      config.outlookClientId = 'test_client_id';
      config.outlookClientSecret = 'test_client_secret';
      config.outlookTenantId = 'test_tenant_id';
    }
  });

  describe('sendEmail', () => {
    it('should send email successfully (mock implementation)', async () => {
      // Note: Currently the email service uses a mock implementation
      // In production, this would call Microsoft Graph API
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
        leadId: 'lead123',
        ownerId: 'owner123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(typeof result.messageId).toBe('string');
    });

    it('should validate required parameters', async () => {
      const result = await sendEmail({
        to: '',
        subject: 'Test Subject',
        body: 'Test Body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required');
    });

    it('should handle missing Outlook configuration gracefully', async () => {
      // Save original config
      const config = require('../config/env');
      const originalClientId = config.outlookClientId;
      const originalClientSecret = config.outlookClientSecret;
      const originalTenantId = config.outlookTenantId;

      // Temporarily set config to empty
      config.outlookClientId = '';
      config.outlookClientSecret = '';
      config.outlookTenantId = '';

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
        leadId: 'lead123',
        ownerId: 'owner123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Outlook configuration missing');

      // Restore original config
      config.outlookClientId = originalClientId;
      config.outlookClientSecret = originalClientSecret;
      config.outlookTenantId = originalTenantId;
    });
  });
});

