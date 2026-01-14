const logger = require('../config/logger');
const config = require('../config/env');

/**
 * Slack Service
 * 
 * Handles sending Slack notifications for system events.
 * Single responsibility: send Slack message
 * 
 * Supports:
 * - Incoming Webhook (via SLACK_WEBHOOK_URL)
 * - Bot Token (via SLACK_BOT_TOKEN) - future implementation
 */

/**
 * Send Slack notification
 * 
 * @param {Object} params
 * @param {string} params.target - User ID or channel name (e.g., '#admin', '@user')
 * @param {string} params.message - Message text to send
 * @param {Object} params.metadata - Optional metadata (leadId, actionType, etc.)
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
const sendSlackNotification = async ({ target, message, metadata = {} }) => {
  try {
    // Validate required parameters
    if (!target || !message) {
      throw new Error('Missing required parameters: target or message');
    }

    // Check if Slack is configured
    if (!config.slackWebhookUrl && !config.slackBotToken) {
      logger.warn('Slack not configured. Skipping notification.', { target, message });
      return {
        success: false,
        error: 'Slack not configured',
      };
    }

    logger.info('Sending Slack notification', {
      target,
      messageLength: message.length,
      metadata,
    });

    // Format message with metadata if provided
    let formattedMessage = message;
    if (metadata.leadId) {
      formattedMessage += `\nLead ID: ${metadata.leadId}`;
    }
    if (metadata.timestamp) {
      formattedMessage += `\nTime: ${new Date(metadata.timestamp).toISOString()}`;
    }

    // Use webhook if available (simpler, preferred)
    if (config.slackWebhookUrl) {
      // TODO: Implement actual Slack webhook call
      // In production, this would:
      // 1. Format payload according to Slack webhook format
      // 2. Send POST request to webhook URL
      // 3. Handle response

      // Mock implementation
      logger.info('Slack notification sent via webhook', {
        target,
        webhookUrl: config.slackWebhookUrl.substring(0, 20) + '...',
      });

      return {
        success: true,
      };
    }

    // Fallback to bot token (future implementation)
    if (config.slackBotToken) {
      // TODO: Implement Slack Bot API call
      // In production, this would:
      // 1. Use Slack Web API (chat.postMessage)
      // 2. Authenticate with bot token
      // 3. Send message to user/channel

      logger.info('Slack notification sent via bot token', { target });

      return {
        success: true,
      };
    }

    return {
      success: false,
      error: 'No Slack configuration found',
    };
  } catch (error) {
    logger.error('Slack notification failed', {
      target,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Format Slack message for a given activity type
 * 
 * @param {Object} params
 * @param {string} params.activityType - Activity type (e.g., EMAIL_SENT, CLIENT_REPLIED)
 * @param {Object} params.lead - Lead object (with leadName, companyName, etc.)
 * @param {Object} params.metadata - Additional metadata from activity
 * @returns {string} - Formatted Slack message
 */
const formatActivityMessage = ({ activityType, lead, metadata = {} }) => {
  const leadName = lead?.leadName || 'Unknown Lead';
  const companyName = lead?.companyName || 'Unknown Company';
  const timestamp = new Date().toISOString();

  const messageMap = {
    EMAIL_SENT: `📩 Email sent to ${companyName} (Lead: ${leadName})`,
    CLIENT_REPLIED: `✅ Client replied from ${companyName} (Lead: ${leadName})`,
    FOLLOWUP_TRIGGERED: `⏰ Follow-up triggered for ${companyName} (Lead: ${leadName})`,
    OWNER_CHANGED: `🔄 Ownership changed for ${companyName} (Lead: ${leadName})`,
    OWNER_CHANGE_REQUESTED: `📋 Ownership change requested for ${companyName} (Lead: ${leadName})`,
    SCHEDULE_PAUSED: `⏸️ Schedule paused for ${companyName} (Lead: ${leadName})`,
    CUSTOMER_CREATED: `🎉 Lead converted to customer: ${companyName} (${leadName})`,
    PRODUCT_ASSIGNED: `📦 Product assigned to customer: ${companyName} (${leadName})`,
  };

  const baseMessage = messageMap[activityType] || `📌 Activity: ${activityType} for ${companyName} (Lead: ${leadName})`;

  // Add additional context from metadata
  if (metadata.reason) {
    return `${baseMessage}\nReason: ${metadata.reason}`;
  }

  return baseMessage;
};

/**
 * Resolve notification target based on activity type and context
 * 
 * @param {Object} params
 * @param {string} params.activityType - Activity type
 * @param {Object} params.lead - Lead object
 * @param {Object} params.metadata - Activity metadata
 * @param {Object} params.oldOwnerId - Old owner ID (for OWNER_CHANGED)
 * @param {Object} params.newOwnerId - New owner ID (for OWNER_CHANGED)
 * @returns {Array<string>} - Array of target user IDs or channel names
 */
const resolveNotificationTargets = ({ activityType, lead, metadata = {}, oldOwnerId = null, newOwnerId = null }) => {
  const targets = [];

  // Special case: OWNER_CHANGE_REQUESTED → notify admin channel
  if (activityType === 'OWNER_CHANGE_REQUESTED') {
    targets.push(config.slackAdminChannel);
    return targets;
  }

  // Special case: OWNER_CHANGED → notify both old and new owner
  if (activityType === 'OWNER_CHANGED') {
    if (oldOwnerId) {
      targets.push(`@${oldOwnerId}`);
    }
    if (newOwnerId) {
      targets.push(`@${newOwnerId}`);
    }
    return targets.length > 0 ? targets : [`@${lead?.ownerId}`];
  }

  // Default: notify current lead owner
  if (lead?.ownerId) {
    targets.push(`@${lead.ownerId}`);
  }

  return targets;
};

module.exports = {
  sendSlackNotification,
  formatActivityMessage,
  resolveNotificationTargets,
};

