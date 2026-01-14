export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'WON' | 'FOLLOW_UP' | 'REPLIED' | 'CLOSED';

export interface Lead {
  id: string;
  leadName: string;
  companyName: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  ownerName: string;
  ownerId: string;
  createdById?: string;
  createdByName?: string;
  productId?: string | null;
  productName?: string | null;
  productCode?: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  status?: LeadStatus | '';
  ownerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: PaginationInfo;
}

