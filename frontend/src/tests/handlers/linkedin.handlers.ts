/**
 * MSW Handlers for LinkedIn Integration API
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = 'http://localhost:3000/api';

export const linkedinHandlers = [
  // POST /integrations/linkedin/scrape
  http.post(`${API_BASE_URL}/integrations/linkedin/scrape`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { searchUrl?: string; limit?: number };

    // Simulate validation error if no searchUrl
    if (!body.searchUrl || !body.searchUrl.trim()) {
      return HttpResponse.json(
        {
          success: false,
          message: 'LinkedIn search URL is required',
        },
        { status: 400 }
      );
    }

    // Simulate success response
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return HttpResponse.json({
      success: true,
      message: 'LinkedIn scraping started',
      jobId,
    });
  }),

  // GET /integrations/linkedin/jobs/:jobId
  http.get(`${API_BASE_URL}/integrations/linkedin/jobs/:jobId`, async ({ params }) => {
    await delay(100);

    const { jobId } = params;

    // Simulate different job statuses based on jobId pattern
    // For testing, we can use different jobIds to test different states
    if (typeof jobId === 'string') {
      if (jobId.includes('failed')) {
        return HttpResponse.json({
          success: true,
          data: {
            status: 'FAILED',
          },
        });
      }

      if (jobId.includes('completed')) {
        return HttpResponse.json({
          success: true,
          data: {
            status: 'COMPLETED',
            createdLeads: 12,
          },
        });
      }

      if (jobId.includes('running')) {
        return HttpResponse.json({
          success: true,
          data: {
            status: 'RUNNING',
          },
        });
      }
    }

    // Default: PENDING
    return HttpResponse.json({
      success: true,
      data: {
        status: 'PENDING',
      },
    });
  }),
];

