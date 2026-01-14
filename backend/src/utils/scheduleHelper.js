const { FREQUENCY_TYPE } = require('../core/scheduleEnums');

/**
 * Calculate next run time based on frequency
 * 
 * @param {string} frequencyType - FREQUENCY_TYPE enum value
 * @param {number} frequencyValue - Number for CUSTOM type (days)
 * @param {Date} fromDate - Base date (defaults to now)
 * @returns {Date} - Next run date
 */
const calculateNextRunAt = (frequencyType, frequencyValue = 3, fromDate = new Date()) => {
  const nextDate = new Date(fromDate);

  switch (frequencyType) {
    case FREQUENCY_TYPE.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case FREQUENCY_TYPE.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case FREQUENCY_TYPE.CUSTOM:
      nextDate.setDate(nextDate.getDate() + frequencyValue);
      break;

    default:
      // Default to 3 days if unknown type
      nextDate.setDate(nextDate.getDate() + 3);
  }

  return nextDate;
};

/**
 * Create default schedule for a new lead
 * 
 * @param {string} leadId - Lead ID
 * @param {Date} startDate - When to start (defaults to now + 3 days)
 * @returns {Object} - Schedule data object
 */
const createDefaultSchedule = (leadId, startDate = null) => {
  const baseDate = startDate || new Date();
  const nextRunAt = calculateNextRunAt(FREQUENCY_TYPE.CUSTOM, 3, baseDate);

  return {
    leadId,
    frequencyType: FREQUENCY_TYPE.CUSTOM,
    frequencyValue: 3, // Default: every 3 days
    nextRunAt,
    active: true,
  };
};

module.exports = {
  calculateNextRunAt,
  createDefaultSchedule,
};

