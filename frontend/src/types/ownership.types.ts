export type OwnershipRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OwnershipRequest {
  id: string;
  leadId: string;
  leadName: string;
  currentOwnerId: string;
  currentOwnerName: string;
  requestedOwnerId: string;
  requestedOwnerName: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  status: OwnershipRequestStatus;
  reason?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

