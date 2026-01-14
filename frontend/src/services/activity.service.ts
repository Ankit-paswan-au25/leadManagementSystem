import { get } from './httpClient';
import type { Activity } from '../types/activity.types';

export interface ActivityFilters {
  activityType?: string;
  performedBy?: string;
  leadId?: string;
  limit?: number;
  skip?: number;
}

/**
 * Activity Service
 * Handles API calls for activity logs
 */
export const activityService = {
  /**
   * Get all activities (Admin only)
   * @param filters Optional filters
   * @returns Activities data with pagination
   */
  async getActivities(filters?: ActivityFilters): Promise<{ activities: Activity[]; total: number; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.activityType) {
      params.append('activityType', filters.activityType);
    }
    
    if (filters?.performedBy) {
      params.append('performedBy', filters.performedBy);
    }
    
    if (filters?.leadId) {
      params.append('leadId', filters.leadId);
    }
    
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    if (filters?.skip) {
      params.append('skip', filters.skip.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `/activities?${queryString}` : '/activities';

    const response = await get<any>(url);

    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;

    if (!isSuccess) {
      throw new Error(response.message || backendResponse.message || 'Failed to fetch activities');
    }

    const data = backendResponse.data || response.data;

    // Handle backend format: { status: 'success', data: { activities: [...], total: ..., count: ... } }
    if (data && typeof data === 'object' && 'activities' in data && Array.isArray(data.activities)) {
      return {
        activities: data.activities,
        total: data.total || data.activities.length,
        count: data.count || data.activities.length,
      };
    }

    if (Array.isArray(data)) {
      return {
        activities: data,
        total: data.length,
        count: data.length,
      };
    }

    console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
    throw new Error(`Invalid response format from server. Expected activities array but got: ${JSON.stringify(response).substring(0, 200)}`);
  },
};

