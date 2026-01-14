import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Tests run against real frontend + backend
 * Make sure both servers are running before running tests
 */
export default defineConfig({
  testDir: './tests',
  
  // Timeout for each test
  timeout: 60 * 1000, // 60 seconds
  
  // Global setup/teardown timeout
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the app
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    
    // API base URL
    // Can be accessed via test.info().project.use.apiBaseURL
    // Or via process.env.API_BASE_URL
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run your local dev server before starting the tests
  // Uncomment if you want Playwright to start servers automatically
  // webServer: [
  //   {
  //     command: 'cd backend && npm run dev',
  //     url: 'http://localhost:3000/health',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000, // 2 minutes for backend to start
  //   },
  //   {
  //     command: 'cd frontend && npm run dev',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 60 * 1000, // 1 minute for frontend to start
  //   },
  // ],
});

