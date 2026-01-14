import { post, get } from './httpClient';

/**
 * LinkedIn Service
 * Handles API calls for LinkedIn scraping integration
 */

export interface LinkedInScrapeRequest {
  searchUrl: string;
  limit?: number;
}

export interface LinkedInScrapeResponse {
  success: boolean;
  message: string;
  jobId?: string;
}

export interface LinkedInJobStatus {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdLeads?: number;
}

export interface LinkedInJobStatusResponse {
  success: boolean;
  data: LinkedInJobStatus;
}

export const linkedinService = {
  /**
   * Start LinkedIn scraping job
   * @param payload Scraping request payload
   * @returns Response with jobId
   */
  async startScrape(payload: LinkedInScrapeRequest): Promise<LinkedInScrapeResponse> {
    // Backend returns flat structure: { success, message, jobId }
    // Note: httpClient.post<T> expects ApiResponse<T> with data field,
    // but backend returns flat structure, so we use 'any' and cast
    const response = (await post<any>('/integrations/linkedin/scrape', payload)) as LinkedInScrapeResponse;

    if (!response.success) {
      throw new Error(response.message || 'Failed to start LinkedIn scraping');
    }

    return response;
  },

  /**
   * Get LinkedIn scraping job status
   * @param jobId Job ID to check status for
   * @returns Job status data
   */
  async getJobStatus(jobId: string): Promise<LinkedInJobStatus> {
    const response = await get<LinkedInJobStatusResponse>(`/integrations/linkedin/jobs/${jobId}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get job status');
    }

    return response.data;
  },
};

