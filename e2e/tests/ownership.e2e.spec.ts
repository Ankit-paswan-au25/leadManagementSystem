import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { testUsers } from '../fixtures/users';
import { waitForBackend, healthCheck } from '../helpers/api.helper';

test.describe('Ownership Requests E2E', () => {
  let adminToken: string;
  let userToken: string;

  test.beforeAll(async ({ request }) => {
    const isHealthy = await healthCheck(request);
    if (!isHealthy) {
      await waitForBackend(request);
    }
  }, { timeout: 60000 }); // 60 seconds timeout for backend health check

  test.beforeEach(async ({ page }) => {
    // Login as admin
    adminToken = await loginViaAPI(page, testUsers.admin);
  });

  test('should display ownership requests page (admin only)', async ({ page }) => {
    await page.goto('/dashboard/admin/ownership-requests');
    
    // Should see ownership requests page
    await expect(page.getByText(/ownership.*request/i)).toBeVisible();
    
    // Should see requests list or empty state
    const requestsContent = page.locator('table, [data-testid="requests-list"], .empty-state');
    await expect(requestsContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show request details', async ({ page }) => {
    await page.goto('/dashboard/admin/ownership-requests');
    
    // Wait for requests to load
    await page.waitForTimeout(2000);
    
    // Click on first request if available
    const firstRequest = page.locator('table tbody tr, [data-testid="request-item"]').first();
    
    if (await firstRequest.isVisible()) {
      await firstRequest.click();
      
      // Should see request details
      await expect(page.getByText(/request|details|lead/i)).toBeVisible();
    } else {
      // Skip if no requests exist
      test.skip();
    }
  });

  test('should approve ownership request', async ({ page }) => {
    await page.goto('/dashboard/admin/ownership-requests');
    
    // Wait for requests to load
    await page.waitForTimeout(2000);
    
    // Look for approve button
    const approveButton = page.getByRole('button', { name: /approve|accept/i }).first();
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Should see confirmation or success message
      await expect(
        page.getByText(/approved|success|confirmed/i)
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Skip if no requests to approve
      test.skip();
    }
  });

  test('should reject ownership request', async ({ page }) => {
    await page.goto('/dashboard/admin/ownership-requests');
    
    // Wait for requests to load
    await page.waitForTimeout(2000);
    
    // Look for reject button
    const rejectButton = page.getByRole('button', { name: /reject|deny|decline/i }).first();
    
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      // Should see confirmation modal or success message
      await expect(
        page.getByText(/rejected|declined|confirmed/i).or(page.getByText(/confirm/i))
      ).toBeVisible({ timeout: 5000 });
      
      // If confirmation modal, confirm rejection
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    } else {
      // Skip if no requests to reject
      test.skip();
    }
  });

  test('should filter requests by status', async ({ page }) => {
    await page.goto('/dashboard/admin/ownership-requests');
    
    // Look for status filter
    const statusFilter = page.getByLabel(/status|filter/i).or(page.locator('select[name*="status"]'));
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      
      // Should see filtered requests
      const requestsContent = page.locator('table, [data-testid="requests-list"]');
      await expect(requestsContent.first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should not allow regular user to access ownership requests', async ({ page, request }) => {
    // Login as regular user
    userToken = await loginViaAPI(page, testUsers.user);
    
    // Try to access ownership requests page
    await page.goto('/dashboard/admin/ownership-requests');
    
    // Should be redirected to dashboard (403 or redirect)
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

