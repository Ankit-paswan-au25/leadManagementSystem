import type { ScheduleConfig, SchedulePreview } from '../types/schedule.types';

/**
 * Calculate next follow-up date based on schedule configuration
 */
export const calculateNextFollowUp = (config: ScheduleConfig): SchedulePreview => {
  const now = new Date();
  const nextDate = new Date(now);

  switch (config.frequencyType) {
    case 'DAILY':
      nextDate.setDate(now.getDate() + 1);
      return {
        nextFollowUpDate: nextDate,
        description: 'Daily follow-up',
      };

    case 'WEEKLY':
      nextDate.setDate(now.getDate() + 7);
      return {
        nextFollowUpDate: nextDate,
        description: 'Weekly follow-up',
      };

    case 'CUSTOM':
      if (!config.frequencyValue || config.frequencyValue <= 0) {
        throw new Error('Frequency value is required for custom schedule');
      }
      nextDate.setDate(now.getDate() + config.frequencyValue);
      return {
        nextFollowUpDate: nextDate,
        description: `Every ${config.frequencyValue} day${config.frequencyValue > 1 ? 's' : ''}`,
      };

    default:
      throw new Error('Invalid frequency type');
  }
};

/**
 * Format date for display
 */
export const formatFollowUpDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

