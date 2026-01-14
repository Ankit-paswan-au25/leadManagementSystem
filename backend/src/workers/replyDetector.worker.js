const Lead = require('../models/Lead.model');
const Schedule = require('../models/Schedule.model');
const LeadActivity = require('../models/LeadActivity.model');
const { createLeadActivity } = require('../utils/leadActivityHelper');
const { fetchUnreadEmails, markEmailAsRead } = require('../services/outlook.service');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');
const logger = require('../config/logger');

/**
 * Reply Detector Worker
 * 
 * Detects client replies from Outlook inbox and updates leads accordingly.
 * 
 * Flow:
 * 1. Fetch unread emails from Outlook
 * 2. Match sender email with Lead.email
 * 3. If match found:
 *    - Update Lead.status = REPLIED
 *    - Pause schedule
 *    - Create CLIENT_REPLIED activity
 * 4. Mark email as read
 * 
 * Safety:
 * - Errors are caught and logged
 * - Duplicate replies ignored (idempotent)
 * - Does not crash the application
 */
const processEmailReplies = async () => {
  logger.info('Reply detector worker started');

  try {
    // Fetch unread emails from Outlook
    const emails = await fetchUnreadEmails({ limit: 100 });

    logger.info(`Found ${emails.length} unread emails`);

    let processed = 0;
    let matched = 0;
    let errors = 0;

    for (const email of emails) {
      try {
        // Extract sender email (handle different email formats)
        const senderEmail = email.from?.emailAddress?.address || email.from || email.sender?.emailAddress?.address;
        
        if (!senderEmail) {
          logger.warn('Email missing sender information', { emailId: email.id });
          continue;
        }

        // Normalize email (lowercase)
        const normalizedSenderEmail = senderEmail.toLowerCase().trim();

        // Find lead by email
        const lead = await Lead.findOne({ email: normalizedSenderEmail });

        if (!lead) {
          // No matching lead, skip
          logger.debug('No lead found for email', { senderEmail: normalizedSenderEmail });
          continue;
        }

        // Check if this reply was already processed (idempotent)
        const existingReply = await LeadActivity.findOne({
          leadId: lead._id,
          activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
          'metadata.messageId': email.id,
        });

        if (existingReply) {
          logger.debug('Reply already processed', {
            leadId: lead._id,
            messageId: email.id,
          });
          // Mark as read anyway and continue
          await markEmailAsRead(email.id);
          continue;
        }

        // Process reply
        // 1. Update lead status to REPLIED
        lead.status = LEAD_STATUS.REPLIED;
        lead.lastContactedAt = new Date();
        await lead.save();

        // 2. Pause schedule
        const schedule = await Schedule.findOne({ leadId: lead._id, active: true });
        if (schedule) {
          schedule.active = false;
          await schedule.save();

          // Log schedule pause
          await createLeadActivity({
            leadId: lead._id,
            activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
            performedBy: lead.ownerId, // System action
            ownerAtTime: lead.ownerId, // Current owner at time of pause
            lead, // Pass lead for Slack notification
            metadata: {
              reason: 'Client replied',
              pausedBy: 'SYSTEM',
            },
            description: 'Schedule auto-paused due to client reply',
          });
        }

        // 3. Create CLIENT_REPLIED activity
        await createLeadActivity({
          leadId: lead._id,
          activityType: ACTIVITY_TYPE.CLIENT_REPLIED,
          performedBy: lead.ownerId, // System action
          ownerAtTime: lead.ownerId, // Current owner at time of reply detection
          lead, // Pass lead for Slack notification
          metadata: {
            messageId: email.id,
            subject: email.subject || 'No subject',
            receivedBy: 'SYSTEM',
          },
          description: `Client reply detected from ${senderEmail}`,
        });

        // 4. Mark email as read
        await markEmailAsRead(email.id);

        logger.info('Client reply processed successfully', {
          leadId: lead._id,
          leadEmail: lead.email,
          messageId: email.id,
          ownerId: lead.ownerId,
        });

        matched++;
        processed++;
      } catch (error) {
        errors++;
        logger.error('Error processing email reply', {
          emailId: email.id,
          error: error.message,
          stack: error.stack,
        });
        // Continue with next email (don't crash)
      }
    }

    logger.info('Reply detector worker completed', {
      processed,
      matched,
      errors,
      total: emails.length,
    });

    return {
      processed,
      matched,
      errors,
      total: emails.length,
    };
  } catch (error) {
    logger.error('Reply detector worker failed', {
      error: error.message,
      stack: error.stack,
    });
    // Return error info but don't throw (worker should be resilient)
    return {
      processed: 0,
      matched: 0,
      errors: 1,
      total: 0,
      error: error.message,
    };
  }
};

module.exports = {
  processEmailReplies,
};

