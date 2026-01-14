export type FrequencyType = 'DAILY' | 'WEEKLY' | 'CUSTOM';

export interface ScheduleConfig {
  frequencyType: FrequencyType;
  frequencyValue?: number; // Required for CUSTOM, optional for others
}

export interface SchedulePreview {
  nextFollowUpDate: Date;
  description: string;
}

