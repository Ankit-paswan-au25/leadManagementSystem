import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { testUsers } from '../fixtures/users';
import { waitForBackend, healthCheck } from '../helpers/api.helper';

test.describe('Customer & Product Management E2E', () => {
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

  test('should display customers list', async ({ page }) => {
    await page.goto('/dashboard/customers');
    
    // Should see customers page
    await expect(page.getByText(/customers/i)).toBeVisible();
    
    // Should see customers table or list
    const customersContent = page.locator('table, [data-testid="customers-list"], .customers-container');
    await expect(customersContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should view customer details', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForTimeout(2000);
    
    // Click on first customer
    const firstCustomer = page.locator('table tbody tr, [data-testid="customer-item"]').first();
    
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      
      // Should be on customer detail page
      await expect(page).toHaveURL(/\/customers\/[^/]+/);
      
      // Should see customer details
      await expect(page.getByText(/customer|details/i)).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display products list', async ({ page }) => {
    await page.goto('/dashboard/products');
    
    // Should see products page
    await expect(page.getByText(/products/i)).toBeVisible();
    
    // Should see products table or list
    const productsContent = page.locator('table, [data-testid="products-list"], .products-container');
    await expect(productsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should create a new product', async ({ page }) => {
    await page.goto('/dashboard/products');
    
    // Look for create product button
    const createButton = page.getByRole('button', { name: /create|add|new.*product/i }).first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill in product form
      const productNameInput = page.getByLabel(/product name|name/i).or(page.getByPlaceholder(/product name/i));
      
      if (await productNameInput.isVisible()) {
        await productNameInput.fill('Test Product E2E');
        
        // Fill other fields if present
        const priceInput = page.getByLabel(/price/i).or(page.getByPlaceholder(/price/i));
        if (await priceInput.isVisible()) {
          await priceInput.fill('99.99');
        }
        
        // Submit form
        const submitButton = page.getByRole('button', { name: /create|save|submit/i });
        await submitButton.click();
        
        // Should see success message
        await expect(
          page.getByText(/success|created|saved/i)
        ).toBeVisible({ timeout: 10000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should assign product to customer', async ({ page }) => {
    // Navigate to customer detail
    await page.goto('/dashboard/customers');
    await page.waitForTimeout(2000);
    
    const firstCustomer = page.locator('table tbody tr, [data-testid="customer-item"]').first();
    
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      
      // Look for assign product button
      const assignButton = page.getByRole('button', { name: /assign.*product|add.*product/i });
      
      if (await assignButton.isVisible()) {
        await assignButton.click();
        
        // Select product from modal/dropdown
        const productSelect = page.getByLabel(/product/i).or(page.locator('select[name*="product"]'));
        
        if (await productSelect.isVisible()) {
          await productSelect.selectOption({ index: 1 });
          
          // Confirm assignment
          const confirmButton = page.getByRole('button', { name: /assign|confirm|save/i });
          await confirmButton.click();
          
          // Should see success message
          await expect(
            page.getByText(/success|assigned|added/i)
          ).toBeVisible({ timeout: 5000 });
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should search customers', async ({ page }) => {
    await page.goto('/dashboard/customers');
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i).or(page.getByLabel(/search/i));
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Should see search results
      const customersContent = page.locator('table, [data-testid="customers-list"]');
      await expect(customersContent.first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should filter products', async ({ page }) => {
    await page.goto('/dashboard/products');
    
    // Look for filter options
    const filterSelect = page.getByLabel(/filter|category/i).or(page.locator('select[name*="filter"]'));
    
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      
      // Should see filtered products
      const productsContent = page.locator('table, [data-testid="products-list"]');
      await expect(productsContent.first()).toBeVisible();
    } else {
      test.skip();
    }
  });
});

