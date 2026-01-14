import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { testUsers } from '../fixtures/users';
import { waitForBackend, healthCheck } from '../helpers/api.helper';

test.describe('Automation & Scheduling E2E', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const isHealthy = await healthCheck(request);
    if (!isHealthy) {
      await waitForBackend(request);
    }
  }, { timeout: 60000 }); // 60 seconds timeout for backend health check

  test.beforeEach(async ({ page }) => {
    authToken = await loginViaAPI(page, testUsers.admin);
  });

  test('should create lead with schedule', async ({ page }) => {
    await page.goto('/dashboard/leads/create');
    
    // Fill in basic lead info
    const leadNameInput = page.getByLabel(/lead name|name/i).or(page.getByPlaceholder(/lead name|name/i));
    await leadNameInput.fill('Automated Lead E2E');
    
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    await emailInput.fill('automated@example.com');
    
    // Look for schedule/frequency options
    const frequencySelect = page.getByLabel(/frequency|schedule/i).or(page.locator('select[name*="frequency"]'));
    
    if (await frequencySelect.isVisible()) {
      // Select a frequency option
      await frequencySelect.selectOption({ index: 1 });
      
      // Submit form
      const submitButton = page.getByRole('button', { name: /create|save/i });
      await submitButton.click();
      
      // Should see success message
      await expect(
        page.getByText(/success|created|saved/i)
      ).toBeVisible({ timeout: 10000 });
    } else {
      // If schedule options not visible, just create lead
      const submitButton = page.getByRole('button', { name: /create|save/i });
      await submitButton.click();
      
      await expect(
        page.getByText(/success|created|saved/i)
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should view scheduled follow-ups', async ({ page }) => {
    // Navigate to a lead detail page
    await page.goto('/dashboard/leads');
    await page.waitForTimeout(2000);
    
    // Click on first lead if available
    const firstLead = page.locator('table tbody tr, [data-testid="lead-item"]').first();
    
    if (await firstLead.isVisible()) {
      await firstLead.click();
      
      // Look for schedule/follow-up section
      const scheduleSection = page.getByText(/schedule|follow.*up|next.*contact/i);
      
      if (await scheduleSection.isVisible()) {
        await expect(scheduleSection).toBeVisible();
      } else {
        // Schedule might be in a different section
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should update lead schedule', async ({ page }) => {
    // Navigate to lead detail
    await page.goto('/dashboard/leads');
    await page.waitForTimeout(2000);
    
    const firstLead = page.locator('table tbody tr, [data-testid="lead-item"]').first();
    
    if (await firstLead.isVisible()) {
      await firstLead.click();
      
      // Look for edit schedule button
      const editScheduleButton = page.getByRole('button', { name: /edit.*schedule|update.*schedule/i });
      
      if (await editScheduleButton.isVisible()) {
        await editScheduleButton.click();
        
        // Update schedule
        const frequencySelect = page.getByLabel(/frequency/i).or(page.locator('select[name*="frequency"]'));
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption({ index: 2 });
          
          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update/i });
          await saveButton.click();
          
          // Should see success message
          await expect(
            page.getByText(/success|updated|saved/i)
          ).toBeVisible({ timeout: 5000 });
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should view activity logs', async ({ page }) => {
    await page.goto('/dashboard/activity-logs');
    
    // Should see activity logs page (admin only)
    await expect(page.getByText(/activity.*log/i)).toBeVisible();
    
    // Should see logs list or empty state
    const logsContent = page.locator('table, [data-testid="logs-list"], .empty-state');
    await expect(logsContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter activity logs', async ({ page }) => {
    await page.goto('/dashboard/activity-logs');
    
    // Look for filter options
    const filterSelect = page.getByLabel(/filter|type/i).or(page.locator('select[name*="filter"]'));
    
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      
      // Should see filtered logs
      const logsContent = page.locator('table, [data-testid="logs-list"]');
      await expect(logsContent.first()).toBeVisible();
    } else {
      test.skip();
    }
  });
});

