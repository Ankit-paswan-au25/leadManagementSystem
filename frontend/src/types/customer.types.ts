export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'CHURNED';

export type ProductStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

/**
 * Customer interface matching backend API
 */
export interface Customer {
  id: string;
  customerName: string;
  companyName: string;
  primaryEmail: string;
  phone?: string;
  status: CustomerStatus;
  accountOwnerName: string;
}

/**
 * Customer Product interface matching backend API
 * daysRemaining is backend-calculated (source of truth)
 */
export interface CustomerProduct {
  productName: string;
  category?: string;
  startDate: string;
  expiryDate: string;
  status: ProductStatus;
  daysRemaining: number; // Backend-calculated, negative if expired
}
