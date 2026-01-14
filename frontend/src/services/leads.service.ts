import { get, post, put } from './httpClient';
import type { Lead, LeadFilters, LeadsResponse, PaginationInfo } from '../types/lead.types';
import type { LeadActivity } from '../types/activity.types';
import type { ApiResponse } from './httpClient';

/**
 * Leads Service
 * Handles API calls for leads management
 */
export const leadsService = {
  /**
   * Get leads with optional filters and pagination
   * @param filters Optional filters (status, ownerId, page, limit)
   * @returns Object with leads array and pagination info
   */
  async getLeads(filters?: LeadFilters): Promise<LeadsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) {
        params.append('status', filters.status);
      }
      
      if (filters?.ownerId) {
        params.append('ownerId', filters.ownerId);
      }

      if (filters?.page) {
        params.append('page', filters.page.toString());
      }

      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `/leads?${queryString}` : '/leads';

      // Backend returns { status: 'success', data: { leads: [...], pagination: {...} } }
      // httpClient.get returns response.data from axios, which is the full backend response
      const response = await get<any>(url);

      // Log response for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Leads API Response:', response);
      }

      // Handle backend format: { status: 'success', data: { leads: [...], pagination: {...} } }
      const backendResponse = response as any;
      
      // Check if response has status field (backend format)
      if (backendResponse.status === 'success') {
        // Backend format: { status: 'success', data: { leads: [...], pagination: {...} } }
        if (backendResponse.data && backendResponse.data.leads && Array.isArray(backendResponse.data.leads)) {
          return {
            leads: backendResponse.data.leads,
            pagination: backendResponse.data.pagination || {
              page: 1,
              limit: 10,
              total: backendResponse.data.leads.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          };
        }
      }
      
      // Check if response has success field (ApiResponse format)
      if (response.success === true && response.data) {
        // ApiResponse format: { success: true, data: { leads: [...], pagination: {...} } }
        if (response.data.leads && Array.isArray(response.data.leads)) {
          return {
            leads: response.data.leads,
            pagination: response.data.pagination || {
              page: 1,
              limit: 10,
              total: response.data.leads.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          };
        }
        // Fallback: if data is directly an array (backward compatibility)
        if (Array.isArray(response.data)) {
          return {
            leads: response.data,
            pagination: {
              page: 1,
              limit: response.data.length,
              total: response.data.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          };
        }
      }
      
      // Fallback: check if response itself has leads
      if (backendResponse.leads && Array.isArray(backendResponse.leads)) {
        return {
          leads: backendResponse.leads,
          pagination: backendResponse.pagination || {
            page: 1,
            limit: backendResponse.leads.length,
            total: backendResponse.leads.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
      
      // If we get here, something is wrong with the response structure
      console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
      throw new Error(`Invalid response format from server. Expected leads with pagination but got: ${JSON.stringify(response).substring(0, 200)}`);
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  },

  /**
   * Get single lead by ID
   * @param id Lead ID
   * @returns Lead data
   */
  async getLeadById(id: string): Promise<Lead> {
    try {
      const response = await get<any>(`/leads/${id}`);

      // Log response for debugging
      console.log('getLeadById raw response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));

      // Handle backend format: { status: 'success', data: {...} }
      if (response && response.status === 'success' && response.data) {
        console.log('Returning lead data (status format):', response.data);
        return response.data as Lead;
      }

      // Handle ApiResponse format: { success: true, data: {...} }
      if (response && response.success === true && response.data) {
        console.log('Returning lead data (success format):', response.data);
        return response.data as Lead;
      }

      // Fallback: if response itself is the lead object (shouldn't happen but just in case)
      if (response && response.id && response.leadName) {
        console.log('Returning response directly as lead:', response);
        return response as Lead;
      }

      // If we get here, something is wrong with the response structure
      console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
      throw new Error(response?.message || 'Failed to fetch lead - invalid response format');
    } catch (error) {
      console.error('Error fetching lead by ID:', error);
      throw error;
    }
  },

  /**
   * Get activities for a lead
   * @param id Lead ID
   * @returns Array of lead activities
   */
  async getLeadActivities(id: string): Promise<LeadActivity[]> {
    try {
      const response = await get<any>(`/leads/${id}/activities`);

      let activities: any[] = [];

      // Handle backend format: { status: 'success', data: [...] }
      if (response.status === 'success' && response.data) {
        activities = Array.isArray(response.data) ? response.data : [];
      }
      // Handle ApiResponse format: { success: true, data: [...] }
      else if (response.success === true && response.data) {
        activities = Array.isArray(response.data) ? response.data : [];
      } else {
        console.error('Invalid activities response format - Full response:', JSON.stringify(response, null, 2));
        throw new Error(response.message || 'Failed to fetch activities');
      }

      // Transform backend response to match frontend LeadActivity type
      const transformedActivities: LeadActivity[] = activities.map((activity) => {
        // Backend returns: performedBy: { id, name, email }, ownerAtTime: { id, name, email }
        // Frontend expects: performedBy: string, performedByName: string, ownerAtThatTime: string, ownerAtThatTimeName: string
        const performedBy = typeof activity.performedBy === 'object' 
          ? activity.performedBy.id 
          : activity.performedBy;
        const performedByName = typeof activity.performedBy === 'object'
          ? activity.performedBy.name
          : activity.performedByName || 'Unknown';
        const performedByType = activity.performedByType || (activity.performedBy?.name === 'System' ? 'SYSTEM' : 'USER');
        
        const ownerAtThatTime = typeof activity.ownerAtTime === 'object'
          ? activity.ownerAtTime.id
          : activity.ownerAtTime || activity.ownerAtThatTime || '';
        const ownerAtThatTimeName = typeof activity.ownerAtTime === 'object'
          ? activity.ownerAtTime.name
          : activity.ownerAtTimeName || activity.ownerAtThatTimeName || 'Unknown';

        return {
          id: activity.id,
          leadId: activity.leadId || id,
          activityType: activity.activityType,
          performedBy: performedBy,
          performedByType: performedByType,
          performedByName: performedByName,
          ownerAtThatTime: ownerAtThatTime,
          ownerAtThatTimeName: ownerAtThatTimeName,
          timestamp: activity.timestamp || activity.createdAt,
          metadata: activity.metadata, // Keep as object, component will handle it
          description: activity.description, // Add description field
        } as LeadActivity;
      });

      // Sort activities by timestamp (latest first)
      return transformedActivities.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching lead activities:', error);
      throw error;
    }
  },

  /**
   * Create a new lead
   * @param payload Lead creation data
   * @returns Created lead
   */
  async createLead(payload: {
    leadName: string;
    companyName?: string;
    email: string;
    phone?: string;
    frequencyType: 'DAILY' | 'WEEKLY' | 'CUSTOM';
    frequencyValue?: number;
    ownerId?: string;
    productId?: string;
  }): Promise<Lead> {
    const response = await post<Lead>('/leads', payload);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create lead');
    }

    return response.data;
  },

  /**
   * Update a lead
   * @param id Lead ID
   * @param payload Update payload
   * @returns Updated lead data
   */
  async updateLead(
    id: string,
    payload: {
      leadName?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      productId?: string | null;
      nextFollowUpAt?: string | null;
    }
  ): Promise<Lead> {
    const response = await put<any>(`/leads/${id}`, payload);

    // Handle backend format: { status: 'success', data: {...} }
    if (response.status === 'success' && response.data) {
      return response.data;
    }

    // Handle ApiResponse format: { success: true, data: {...} }
    if (response.success === true && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to update lead');
  },
};
