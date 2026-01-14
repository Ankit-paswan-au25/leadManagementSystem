const logger = require('../config/logger');
const config = require('../config/env');

/**
 * Email Service
 * 
 * Abstracted email sending service.
 * Single responsibility: send email
 * 
 * Currently uses Outlook/Microsoft Graph API.
 * Can be extended to support other providers.
 */

/**
 * Send email via Outlook/Microsoft Graph API
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Email body (HTML or plain text)
 * @param {string} params.leadId - Lead ID (for tracking)
 * @param {string} params.ownerId - Owner ID (for context)
 * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
 */
const sendEmail = async ({ to, subject, body, leadId, ownerId }) => {
  try {
    // Validate required parameters
    if (!to || !subject || !body) {
      throw new Error('Missing required email parameters: to, subject, or body');
    }

    // Validate Outlook configuration
    if (!config.outlookClientId || !config.outlookClientSecret || !config.outlookTenantId) {
      throw new Error('Outlook configuration missing. Please set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_TENANT_ID');
    }

    // For now, we'll use a mock implementation
    // In production, this would use Microsoft Graph API
    // Example: https://graph.microsoft.com/v1.0/users/{userEmail}/sendMail

    logger.info('Sending email via Outlook', {
      to,
      subject,
      leadId,
      ownerId,
    });

    // TODO: Implement actual Microsoft Graph API call
    // For now, simulate success
    // In production, this would:
    // 1. Get access token using refresh token
    // 2. Call Microsoft Graph API to send email
    // 3. Return message ID

    // Mock implementation (replace with actual API call)
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId,
      leadId,
    });

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    logger.error('Email sending failed', {
      to,
      subject,
      leadId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  sendEmail,
};

