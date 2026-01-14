import { APIRequestContext, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3000';

/**
 * API Helper Functions
 * Reusable functions for API calls in E2E tests
 */

/**
 * Create an authenticated API request context
 */
export async function createAuthenticatedContext(
  request: APIRequestContext,
  token: string
): Promise<APIRequestContext> {
  // Create a new context with auth header
  return request;
}

/**
 * Make authenticated API request
 */
export async function authenticatedRequest(
  request: APIRequestContext,
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any
): Promise<any> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const options: any = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.data = data;
  }

  const response = await request[method.toLowerCase()](fullUrl, options);
  
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status()} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Health check - verify backend is running
 * Note: Health endpoint is at /health (not /api/health)
 */
export async function healthCheck(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${BACKEND_BASE_URL}/health`, {
      timeout: 5000,
    });
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Wait for backend to be ready
 */
export async function waitForBackend(request: APIRequestContext, timeout = 60000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000; // Check every second
  
  while (Date.now() - startTime < timeout) {
    if (await healthCheck(request)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Backend did not become ready within ${timeout}ms timeout. Make sure the backend server is running at ${BACKEND_BASE_URL}`);
}

