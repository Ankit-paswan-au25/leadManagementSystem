const LeadActivity = require('../models/LeadActivity.model');
const Lead = require('../models/Lead.model');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const { sendSlackNotification, formatActivityMessage, resolveNotificationTargets } = require('../services/slack.service');
const logger = require('../config/logger');

/**
 * Activities that should trigger Slack notifications
 */
const SLACK_NOTIFY_ACTIVITIES = [
  ACTIVITY_TYPE.EMAIL_SENT,
  ACTIVITY_TYPE.CLIENT_REPLIED,
  ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
  ACTIVITY_TYPE.OWNER_CHANGED,
  ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
  ACTIVITY_TYPE.SCHEDULE_PAUSED,
  ACTIVITY_TYPE.CUSTOMER_CREATED,
  ACTIVITY_TYPE.PRODUCT_ASSIGNED,
];

/**
 * Helper function to create LeadActivity records
 * 
 * This ensures consistent activity logging across all Lead operations.
 * Every Lead action must create exactly ONE LeadActivity record.
 * 
 * After creating the activity, triggers Slack notification if applicable.
 * Slack failures do NOT block the main flow.
 * 
 * @param {Object} params
 * @param {string} params.leadId - Lead ID
 * @param {string} params.activityType - Activity type from ACTIVITY_TYPE enum
 * @param {string} params.performedBy - User ID who performed the action
 * @param {string} params.ownerAtTime - Owner ID at the time of this activity
 * @param {Object} params.metadata - Optional metadata object
 * @param {string} params.description - Optional description
 * @param {Date} params.timestamp - Optional custom timestamp (defaults to now)
 * @param {Object} params.lead - Optional Lead object (for Slack notification, fetched if not provided)
 * @param {string} params.oldOwnerId - Optional old owner ID (for OWNER_CHANGED)
 * @param {string} params.newOwnerId - Optional new owner ID (for OWNER_CHANGED)
 * @returns {Promise<LeadActivity>} - Created LeadActivity document
 */
const createLeadActivity = async ({
  leadId,
  activityType,
  performedBy,
  ownerAtTime,
  metadata = {},
  description = null,
  timestamp = null,
  lead = null,
  oldOwnerId = null,
  newOwnerId = null,
}) => {
  // Create and save the activity first (main flow)
  const activity = new LeadActivity({
    leadId,
    activityType,
    performedBy,
    ownerAtTime,
    metadata,
    description,
    timestamp: timestamp || new Date(),
  });

  const savedActivity = await activity.save();

  // Trigger Slack notification if applicable (non-blocking)
  if (SLACK_NOTIFY_ACTIVITIES.includes(activityType)) {
    try {
      // Fetch lead if not provided
      let leadData = lead;
      if (!leadData) {
        leadData = await Lead.findById(leadId).select('leadName companyName ownerId').lean();
      }

      if (leadData) {
        // Format message
        const message = formatActivityMessage({
          activityType,
          lead: leadData,
          metadata,
        });

        // Resolve notification targets
        const targets = resolveNotificationTargets({
          activityType,
          lead: leadData,
          metadata,
          oldOwnerId,
          newOwnerId,
        });

        // Send notifications to all targets (non-blocking)
        const notificationPromises = targets.map(target =>
          sendSlackNotification({
            target,
            message,
            metadata: {
              leadId: leadId.toString(),
              activityType,
              timestamp: savedActivity.timestamp,
              ...metadata,
            },
          }).catch(error => {
            // Log but don't throw - Slack failures shouldn't block main flow
            logger.error('Slack notification failed (non-blocking)', {
              target,
              activityType,
              leadId,
              error: error.message,
            });
            return { success: false, error: error.message };
          })
        );

        // Wait for all notifications (but don't fail if they do)
        await Promise.allSettled(notificationPromises);
      }
    } catch (error) {
      // Log error but don't throw - Slack notification failure should not affect main flow
      logger.error('Failed to send Slack notification (non-blocking)', {
        activityType,
        leadId,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  return savedActivity;
};

module.exports = {
  createLeadActivity,
};

