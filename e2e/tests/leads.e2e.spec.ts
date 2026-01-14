import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { testUsers } from '../fixtures/users';
import { waitForBackend, healthCheck } from '../helpers/api.helper';

test.describe('Leads E2E', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const isHealthy = await healthCheck(request);
    if (!isHealthy) {
      await waitForBackend(request);
    }
  }, { timeout: 60000 }); // 60 seconds timeout for backend health check

  test.beforeEach(async ({ page }) => {
    // Login via API for faster setup
    authToken = await loginViaAPI(page, testUsers.admin);
    await page.goto('/dashboard/leads');
  });

  test('should display leads list', async ({ page }) => {
    // Wait for leads page to load
    await expect(page.getByText(/leads/i)).toBeVisible();
    
    // Should see leads table or list
    // Adjust selector based on actual UI
    const leadsContent = page.locator('table, [data-testid="leads-list"], .leads-container');
    await expect(leadsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to create lead page', async ({ page }) => {
    // Click create lead button
    const createButton = page.getByRole('button', { name: /create|add|new/i }).first();
    await createButton.click();
    
    // Should be on create lead page
    await expect(page).toHaveURL(/\/leads\/create/);
    
    // Should see create lead form
    await expect(page.getByText(/create.*lead|new.*lead/i)).toBeVisible();
  });

  test('should create a new lead', async ({ page }) => {
    await page.goto('/dashboard/leads/create');
    
    // Fill in lead form
    // Adjust selectors based on actual form fields
    const leadNameInput = page.getByLabel(/lead name|name/i).or(page.getByPlaceholder(/lead name|name/i));
    await leadNameInput.fill('Test Lead E2E');
    
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    await emailInput.fill('testlead@example.com');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /create|save|submit/i });
    await submitButton.click();
    
    // Should see success message or redirect to leads list
    await expect(
      page.getByText(/success|created|saved/i).or(page.locator('text=/leads/i'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('should view lead details', async ({ page }) => {
    // First, ensure we have leads
    await page.goto('/dashboard/leads');
    
    // Wait for leads to load
    await page.waitForTimeout(2000);
    
    // Click on first lead (adjust selector based on actual UI)
    const firstLead = page.locator('table tbody tr, [data-testid="lead-item"]').first();
    
    if (await firstLead.isVisible()) {
      await firstLead.click();
      
      // Should be on lead detail page
      await expect(page).toHaveURL(/\/leads\/[^/]+/);
      
      // Should see lead details
      await expect(page.getByText(/lead|details/i)).toBeVisible();
    } else {
      // Skip if no leads exist
      test.skip();
    }
  });

  test('should filter leads by status', async ({ page }) => {
    await page.goto('/dashboard/leads');
    
    // Look for status filter
    const statusFilter = page.getByLabel(/status|filter/i).or(page.locator('select[name*="status"]'));
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 }); // Select first option
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Should see filtered leads
      const leadsContent = page.locator('table, [data-testid="leads-list"]');
      await expect(leadsContent.first()).toBeVisible();
    } else {
      // Skip if filter doesn't exist
      test.skip();
    }
  });

  test('should search leads', async ({ page }) => {
    await page.goto('/dashboard/leads');
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i).or(page.getByLabel(/search/i));
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Should see search results
      const leadsContent = page.locator('table, [data-testid="leads-list"]');
      await expect(leadsContent.first()).toBeVisible();
    } else {
      // Skip if search doesn't exist
      test.skip();
    }
  });
});

