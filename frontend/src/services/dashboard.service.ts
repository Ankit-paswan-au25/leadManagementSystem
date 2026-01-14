import { get } from './httpClient';

export interface DashboardStats {
  totalLeads: number;
  salesTarget: number;
  zohoPushedCount: number;
  zohoLoggedIn: boolean;
}

/**
 * Dashboard Service
 * Handles API calls for dashboard statistics
 */
export const dashboardService = {
  /**
   * Get dashboard statistics for the logged-in user
   * @returns Dashboard stats
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await get<any>('/dashboard/stats');

    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;

    if (!isSuccess) {
      throw new Error(response.message || backendResponse.message || 'Failed to fetch dashboard stats');
    }

    const data = backendResponse.data || response.data;

    if (data && typeof data === 'object' && 'stats' in data) {
      return data.stats;
    }

    console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
    throw new Error(`Invalid response format from server. Expected stats object but got: ${JSON.stringify(response).substring(0, 200)}`);
  },
};

