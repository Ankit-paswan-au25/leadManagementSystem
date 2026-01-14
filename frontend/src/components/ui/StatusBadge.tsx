import React from 'react';
import type { LeadStatus } from '../../types/lead.types';

export interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: {
    label: 'New',
    className: 'bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400',
  },
  CONTACTED: {
    label: 'Contacted',
    className: 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400',
  },
  FOLLOW_UP: {
    label: 'Follow Up',
    className: 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400',
  },
  REPLIED: {
    label: 'Replied',
    className: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  },
  QUALIFIED: {
    label: 'Qualified',
    className: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400',
  },
  LOST: {
    label: 'Lost',
    className: 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-400',
  },
  WON: {
    label: 'Won',
    className: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Handle undefined or invalid status values
  if (!status || !statusConfig[status]) {
    console.warn(`Invalid or missing status: ${status}`);
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 ${className}`}
      >
        Unknown
      </span>
    );
  }

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;

