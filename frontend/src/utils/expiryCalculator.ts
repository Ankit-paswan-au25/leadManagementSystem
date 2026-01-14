/**
 * Calculate days remaining until expiry date
 */
export const calculateDaysRemaining = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Determine product status based on expiry date
 */
export const getProductStatus = (expiryDate: string): 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' => {
  const daysRemaining = calculateDaysRemaining(expiryDate);
  
  if (daysRemaining < 0) {
    return 'EXPIRED';
  } else if (daysRemaining <= 30) {
    return 'EXPIRING_SOON';
  } else {
    return 'ACTIVE';
  }
};

/**
 * Format days remaining for display
 */
export const formatDaysRemaining = (days: number): string => {
  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  } else if (days === 0) {
    return 'Expires today';
  } else if (days === 1) {
    return 'Expires tomorrow';
  } else {
    return `${days} days remaining`;
  }
};

