import { get, post } from './httpClient';
import type { OwnershipRequest } from '../types/ownership.types';

/**
 * Ownership Service
 * Handles API calls for ownership change requests
 */
export const ownershipService = {
  /**
   * Request ownership change for a lead
   * @param leadId Lead ID
   * @param payload Request payload (requestedOwnerId, reason?)
   * @returns Created ownership request
   */
  async requestOwnershipChange(
    leadId: string,
    payload: {
      requestedOwnerId: string;
      reason?: string;
    }
  ): Promise<OwnershipRequest> {
    const response = await post<any>(`/leads/${leadId}/owner-change-request`, payload);

    // Handle backend format: { status: 'success', data: {...} }
    if (response.status === 'success' && response.data) {
      return response.data;
    }

    // Handle ApiResponse format: { success: true, data: {...} }
    if (response.success === true && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to request ownership change');
  },

  /**
   * Get all pending ownership requests (Admin only)
   * @returns Array of pending ownership requests
   */
  async getPendingRequests(): Promise<OwnershipRequest[]> {
    const response = await get<any>('/ownership/requests');

    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;

    if (!isSuccess) {
      throw new Error(response.message || backendResponse.message || 'Failed to fetch ownership requests');
    }

    const data = backendResponse.data || response.data;

    // Handle backend format: { status: 'success', data: { requests: [...], count: ... } }
    if (data && typeof data === 'object' && 'requests' in data && Array.isArray(data.requests)) {
      return data.requests;
    }

    if (Array.isArray(data)) {
      return data;
    }

    console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
    throw new Error(`Invalid response format from server. Expected requests array but got: ${JSON.stringify(response).substring(0, 200)}`);
  },

  /**
   * Approve an ownership request (Admin only)
   * @param leadId Lead ID
   * @returns Approved request data
   */
  async approveRequest(leadId: string): Promise<OwnershipRequest> {
    const response = await post<OwnershipRequest>(`/ownership/requests/${leadId}/approve`, {});

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to approve ownership request');
    }

    return response.data;
  },

  /**
   * Reject an ownership request (Admin only)
   * @param leadId Lead ID
   * @param reason Optional rejection reason
   * @returns Rejected request data
   */
  async rejectRequest(leadId: string, reason?: string): Promise<OwnershipRequest> {
    const payload = reason ? { reason } : {};
    const response = await post<OwnershipRequest>(`/ownership/requests/${leadId}/reject`, payload);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to reject ownership request');
    }

    return response.data;
  },
};
