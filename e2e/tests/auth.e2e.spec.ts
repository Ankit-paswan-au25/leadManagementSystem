import { test, expect } from '@playwright/test';
import { loginViaUI, logout, isAuthenticated } from '../helpers/auth.helper';
import { testUsers } from '../fixtures/users';
import { waitForBackend, healthCheck } from '../helpers/api.helper';

test.describe('Authentication E2E', () => {
  // Verify backend is running before tests
  test.beforeAll(async ({ request }) => {
    const isHealthy = await healthCheck(request);
    if (!isHealthy) {
      await waitForBackend(request);
    }
  }, { timeout: 60000 }); // 60 seconds timeout for backend health check

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginViaUI(page, testUsers.admin);
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.getByPlaceholder(/email/i).fill('invalid@test.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 5000 });
    
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid email
    await page.getByPlaceholder(/email/i).fill('not-an-email');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginViaUI(page, testUsers.admin);
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Logout
    await logout(page);
    
    // Should be on login page
    await expect(page).toHaveURL(/\/login/);
    
    // Should not be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should maintain session after page reload', async ({ page }) => {
    // Login
    await loginViaUI(page, testUsers.admin);
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated and on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should redirect authenticated user away from login page', async ({ page }) => {
    // Login first
    await loginViaUI(page, testUsers.admin);
    
    // Try to access login page
    await page.goto('/login');
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

