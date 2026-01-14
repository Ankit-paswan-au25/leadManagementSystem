import { post } from './httpClient';

/**
 * Zoho Service
 * Handles API calls for Zoho CRM integration
 */
export interface ZohoResponse {
  success: boolean;
  message: string;
}

export const zohoService = {
  /**
   * Fetch leads from Zoho CRM
   * @returns Response message
   */
  async fetchLeads(): Promise<string> {
    const response = await post<ZohoResponse>('/integrations/zoho/fetch-leads', {});

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch leads from Zoho');
    }

    return response.message || 'Zoho lead fetch started';
  },

  /**
   * Push leads to Zoho CRM
   * @returns Response message
   */
  async pushLeads(): Promise<string> {
    const response = await post<ZohoResponse>('/integrations/zoho/push-leads', {});

    if (!response.success) {
      throw new Error(response.message || 'Failed to push leads to Zoho');
    }

    return response.message || 'Zoho lead push started';
  },
};

