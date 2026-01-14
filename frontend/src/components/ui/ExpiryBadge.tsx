import React from 'react';
import type { CustomerProduct } from '../../types/customer.types';
import { formatDaysRemaining } from '../../utils/expiryCalculator';

interface ExpiryBadgeProps {
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  daysRemaining: number; // Backend-calculated
}

const ExpiryBadge: React.FC<ExpiryBadgeProps> = ({ status, daysRemaining }) => {
  const getBadgeClass = (): string => {
    switch (status) {
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'ACTIVE':
        // Check daysRemaining for warning state (backend-driven)
        if (daysRemaining <= 30 && daysRemaining > 0) {
          return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
        }
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'EXPIRED':
        return 'Expired';
      case 'CANCELLED':
        return 'Cancelled';
      case 'ACTIVE':
        // Show "Expiring Soon" if daysRemaining <= 30 (backend-driven)
        if (daysRemaining <= 30 && daysRemaining > 0) {
          return 'Expiring Soon';
        }
        return 'Active';
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeClass()}`}>
        {getStatusLabel()}
      </span>
      <span className="text-xs text-text-tertiary">{formatDaysRemaining(daysRemaining)}</span>
    </div>
  );
};

export default ExpiryBadge;
