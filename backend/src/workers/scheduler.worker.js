const Schedule = require('../models/Schedule.model');
const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const { createLeadActivity } = require('../utils/leadActivityHelper');
const { calculateNextRunAt } = require('../utils/scheduleHelper');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');
const { sendEmail } = require('../services/email.service');
const logger = require('../config/logger');

/**
 * Scheduler Worker
 * 
 * Finds schedules that are due and triggers follow-ups.
 * Runs periodically (called by cron or queue system).
 * 
 * Safety:
 * - Errors are caught and logged
 * - Failed schedules retried next cycle
 * - Does not crash the application
 */
const processScheduledFollowUps = async () => {
  const now = new Date();
  logger.info('Scheduler worker started', { timestamp: now });

  try {
    // Find all active schedules that are due
    const dueSchedules = await Schedule.find({
      active: true,
      nextRunAt: { $lte: now },
    }).populate('leadId');

    logger.info(`Found ${dueSchedules.length} due schedules`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const schedule of dueSchedules) {
      try {
        // Get leadId (handle both populated and non-populated)
        let leadId;
        if (schedule.leadId && schedule.leadId._id) {
          leadId = schedule.leadId._id.toString();
        } else if (schedule.leadId) {
          leadId = schedule.leadId.toString();
        } else {
          logger.warn('Invalid schedule: missing leadId', { scheduleId: schedule._id });
          skipped++;
          continue;
        }

        // Get fresh lead data (owner-aware: read current owner at runtime)
        const lead = await Lead.findById(leadId);
        
        if (!lead) {
          logger.warn('Lead not found for schedule', { scheduleId: schedule._id, leadId });
          // Pause schedule if lead doesn't exist
          schedule.active = false;
          await schedule.save();
          skipped++;
          continue;
        }

        // Check if lead status should pause the schedule
        if (lead.status === LEAD_STATUS.REPLIED || lead.status === LEAD_STATUS.CLOSED) {
          // Pause schedule and log activity
          schedule.active = false;
          await schedule.save();

          // Create SCHEDULE_PAUSED activity
          await createLeadActivity({
            leadId: lead._id,
            activityType: ACTIVITY_TYPE.SCHEDULE_PAUSED,
            performedBy: lead.ownerId, // System action, but track owner context
            ownerAtTime: lead.ownerId, // Current owner at time of pause
            metadata: {
              reason: `Lead status is ${lead.status}`,
              pausedBy: 'SYSTEM',
            },
            description: `Schedule auto-paused due to lead status: ${lead.status}`,
          });

          logger.info('Schedule paused due to lead status', {
            scheduleId: schedule._id,
            leadId: lead._id,
            status: lead.status,
          });

          skipped++;
          continue;
        }

        // Trigger follow-up
        // 1. Create LeadActivity (FOLLOWUP_TRIGGERED)
        await createLeadActivity({
          leadId: lead._id,
          activityType: ACTIVITY_TYPE.FOLLOWUP_TRIGGERED,
          performedBy: lead.ownerId, // System action, but track owner context
          ownerAtTime: lead.ownerId, // Current owner at time of trigger (owner-aware)
          lead, // Pass lead for Slack notification
          metadata: {
            triggeredBy: 'SYSTEM',
            frequencyType: schedule.frequencyType,
            frequencyValue: schedule.frequencyValue,
          },
          description: `Follow-up triggered automatically (${schedule.frequencyType}, every ${schedule.frequencyValue} days)`,
        });

        // 2. Send follow-up email
        const emailSubject = `Follow-up: ${lead.leadName}`;
        const emailBody = `Hello ${lead.leadName},\n\nThis is a follow-up regarding your inquiry.\n\nBest regards,\nSales Team`;
        
        const emailResult = await sendEmail({
          to: lead.email,
          subject: emailSubject,
          body: emailBody,
          leadId: lead._id.toString(),
          ownerId: lead.ownerId.toString(),
        });

        // 3. Log email result
        if (emailResult.success) {
          await createLeadActivity({
            leadId: lead._id,
            activityType: ACTIVITY_TYPE.EMAIL_SENT,
            performedBy: lead.ownerId, // System action
            ownerAtTime: lead.ownerId, // Current owner at time of send
            lead, // Pass lead for Slack notification
            metadata: {
              sentBy: 'SYSTEM',
              messageId: emailResult.messageId,
              subject: emailSubject,
            },
            description: `Follow-up email sent to ${lead.email}`,
          });
        } else {
          await createLeadActivity({
            leadId: lead._id,
            activityType: ACTIVITY_TYPE.EMAIL_FAILED,
            performedBy: lead.ownerId, // System action
            ownerAtTime: lead.ownerId, // Current owner at time of failure
            metadata: {
              failedBy: 'SYSTEM',
              errorMessage: emailResult.error,
              subject: emailSubject,
            },
            description: `Failed to send follow-up email to ${lead.email}: ${emailResult.error}`,
          });
        }

        // 4. Update lead status to FOLLOW_UP
        lead.status = LEAD_STATUS.FOLLOW_UP;
        lead.lastContactedAt = now;
        await lead.save();

        // 5. Calculate next run time
        const nextRunAt = calculateNextRunAt(
          schedule.frequencyType,
          schedule.frequencyValue,
          now
        );

        // 6. Update schedule
        schedule.nextRunAt = nextRunAt;
        await schedule.save();

        logger.info('Follow-up triggered successfully', {
          scheduleId: schedule._id,
          leadId: lead._id,
          ownerId: lead.ownerId,
          nextRunAt,
        });

        processed++;
      } catch (error) {
        errors++;
        logger.error('Error processing schedule', {
          scheduleId: schedule._id,
          error: error.message,
          stack: error.stack,
        });
        // Continue with next schedule (don't crash)
      }
    }

    logger.info('Scheduler worker completed', {
      processed,
      skipped,
      errors,
      total: dueSchedules.length,
    });

    return {
      processed,
      skipped,
      errors,
      total: dueSchedules.length,
    };
  } catch (error) {
    logger.error('Scheduler worker failed', {
      error: error.message,
      stack: error.stack,
    });
    // Return error info but don't throw (scheduler should be resilient)
    return {
      processed: 0,
      skipped: 0,
      errors: 1,
      total: 0,
      error: error.message,
    };
  }
};

module.exports = {
  processScheduledFollowUps,
};

