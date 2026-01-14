/**
 * MSW Handlers for Zoho Integration API
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = 'http://localhost:3000/api';

export const zohoHandlers = [
  // POST /integrations/zoho/fetch-leads
  http.post(`${API_BASE_URL}/integrations/zoho/fetch-leads`, async () => {
    await delay(100);

    return HttpResponse.json({
      success: true,
      message: 'Zoho lead fetch started',
    });
  }),

  // POST /integrations/zoho/push-leads
  http.post(`${API_BASE_URL}/integrations/zoho/push-leads`, async () => {
    await delay(100);

    return HttpResponse.json({
      success: true,
      message: 'Zoho lead push started',
    });
  }),
];

