import { Page, expect } from '@playwright/test';
import { TestUser } from '../fixtures/users';

/**
 * Auth Helper Functions
 * Reusable functions for authentication flows in E2E tests
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Login via API and set auth state in browser
 * Faster than UI login for tests that don't need to test login flow
 */
export async function loginViaAPI(page: Page, user: TestUser): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  if (!data.success || !data.data?.token) {
    throw new Error(`Login failed: ${data.message || 'Unknown error'}`);
  }

  const token = data.data.token;

  // Set auth state in browser localStorage
  await page.goto(FRONTEND_URL);
  await page.evaluate(({ token, role, email }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_email', email);
    // Set user object
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'test_user_id',
      email: email,
      role: role,
    }));
  }, { token, role: user.role, email: user.email });

  return token;
}

/**
 * Login via UI (slower but tests the full login flow)
 */
export async function loginViaUI(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  
  // Wait for login form
  await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  
  // Fill in credentials
  await page.getByPlaceholder(/email/i).fill(user.email);
  await page.getByPlaceholder(/password/i).fill(user.password);
  
  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Logout user
 */
export async function logout(page: Page): Promise<void> {
  // If there's a logout button, click it
  const logoutButton = page.getByRole('button', { name: /logout/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else {
    // Clear auth state directly
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_role');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_user');
    });
    await page.goto('/login');
  }
  
  // Verify we're on login page
  await expect(page).toHaveURL(/\/login/);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!localStorage.getItem('auth_token');
  });
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page): Promise<void> {
  // Wait for auth token to be set
  await page.waitForFunction(() => {
    return !!localStorage.getItem('auth_token');
  }, { timeout: 5000 });
}

