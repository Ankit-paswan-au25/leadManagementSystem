import { test, expect } from '@playwright/test';
import { waitForBackend, healthCheck } from '../helpers/api.helper';

test.describe('Registration E2E', () => {
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

  test('should navigate to register page from login', async ({ page }) => {
    await page.goto('/login');
    
    const registerLink = page.getByRole('link', { name: /sign up/i });
    await registerLink.click();
    
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    // Fill in registration form
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill('E2E Test User');
    
    const emailInput = page.getByLabel(/email/i);
    const timestamp = Date.now();
    const testEmail = `e2etest${timestamp}@example.com`;
    await emailInput.fill(testEmail);
    
    const passwordInput = page.getByLabel(/^password$/i);
    await passwordInput.fill('password123');
    
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await confirmPasswordInput.fill('password123');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    // Should see success message
    await expect(
      page.getByText(/registration successful|pending activation/i)
    ).toBeVisible({ timeout: 10000 });
    
    // Should redirect to login page after delay
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/register');
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/register');
    
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill('Test User');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalid-email');
    
    const passwordInput = page.getByLabel(/^password$/i);
    await passwordInput.fill('password123');
    
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await confirmPasswordInput.fill('password123');
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill('Test User');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('test@example.com');
    
    const passwordInput = page.getByLabel(/^password$/i);
    await passwordInput.fill('password123');
    
    const confirmPasswordInput = page.getByLabel(/confirm password/i);
    await confirmPasswordInput.fill('differentpassword');
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page }) => {
    // First, register a user
    await page.goto('/register');
    
    const timestamp = Date.now();
    const testEmail = `duplicate${timestamp}@example.com`;
    
    await page.getByLabel(/full name/i).fill('First User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Wait for first registration to complete
    await expect(page.getByText(/registration successful/i)).toBeVisible({ timeout: 10000 });
    
    // Try to register again with same email
    await page.goto('/register');
    
    await page.getByLabel(/full name/i).fill('Second User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should show error for duplicate email
    await expect(
      page.getByText(/already exists|duplicate/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login page from register', async ({ page }) => {
    await page.goto('/register');
    
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await loginLink.click();
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});

