const { calculateNextRunAt, createDefaultSchedule } = require('../utils/scheduleHelper');
const { FREQUENCY_TYPE } = require('../core/scheduleEnums');
const mongoose = require('mongoose');

describe('Schedule Helper', () => {
  describe('calculateNextRunAt', () => {
    it('should calculate next run for DAILY frequency', () => {
      const baseDate = new Date('2024-01-01T10:00:00Z');
      const nextRun = calculateNextRunAt(FREQUENCY_TYPE.DAILY, null, baseDate);

      expect(nextRun.getDate()).toBe(2); // Next day
      expect(nextRun.getMonth()).toBe(baseDate.getMonth());
    });

    it('should calculate next run for WEEKLY frequency', () => {
      const baseDate = new Date('2024-01-01T10:00:00Z');
      const nextRun = calculateNextRunAt(FREQUENCY_TYPE.WEEKLY, null, baseDate);

      const diffDays = Math.floor((nextRun.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should calculate next run for CUSTOM frequency', () => {
      const baseDate = new Date('2024-01-01T10:00:00Z');
      const nextRun = calculateNextRunAt(FREQUENCY_TYPE.CUSTOM, 5, baseDate);

      const diffDays = Math.floor((nextRun.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(5);
    });

    it('should default to 3 days for unknown frequency type', () => {
      const baseDate = new Date('2024-01-01T10:00:00Z');
      const nextRun = calculateNextRunAt('UNKNOWN_TYPE', 3, baseDate);

      const diffDays = Math.floor((nextRun.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(3);
    });

    it('should use current date if fromDate not provided', () => {
      const now = new Date();
      const nextRun = calculateNextRunAt(FREQUENCY_TYPE.CUSTOM, 3);

      const diffDays = Math.floor((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(3);
    });
  });

  describe('createDefaultSchedule', () => {
    it('should create default schedule data', () => {
      const leadId = new mongoose.Types.ObjectId();
      const scheduleData = createDefaultSchedule(leadId);

      expect(scheduleData.leadId.toString()).toBe(leadId.toString());
      expect(scheduleData.frequencyType).toBe(FREQUENCY_TYPE.CUSTOM);
      expect(scheduleData.frequencyValue).toBe(3);
      expect(scheduleData.active).toBe(true);
      expect(scheduleData.nextRunAt).toBeInstanceOf(Date);
    });

    it('should use custom start date if provided', () => {
      const leadId = new mongoose.Types.ObjectId();
      const startDate = new Date('2024-12-31T10:00:00Z');
      const scheduleData = createDefaultSchedule(leadId, startDate);

      const diffDays = Math.floor(
        (scheduleData.nextRunAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(3);
    });
  });
});

