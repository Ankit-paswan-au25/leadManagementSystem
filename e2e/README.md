# E2E Tests with Playwright

End-to-end tests for the Sales Management System using Playwright.

## Prerequisites

1. **Backend server running** on `http://localhost:3000`
2. **Frontend server running** on `http://localhost:5173`
3. **MongoDB running** (for backend)

## Setup

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

## Configuration

Tests are configured in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:5173` (frontend)
- **API Base URL**: `http://localhost:3000/api` (backend)
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/auth.e2e.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
```

## Test Structure

```
e2e/
 ├─ tests/              # Test files
 │   ├─ auth.e2e.spec.ts
 │   ├─ leads.e2e.spec.ts
 │   ├─ ownership.e2e.spec.ts
 │   ├─ automation.e2e.spec.ts
 │   └─ customer-product.e2e.spec.ts
 ├─ fixtures/           # Test data
 │   └─ users.ts
 ├─ helpers/            # Helper functions
 │   ├─ auth.helper.ts
 │   └─ api.helper.ts
 └─ playwright.config.ts
```

## Test Users

Test users are defined in `fixtures/users.ts`:

- **Admin**: `admin@test.com` / `Admin123!`
- **User**: `user@test.com` / `User123!`

**Note**: These users must exist in your test database.

## CI/CD

Tests are configured to run in CI:

- Retries: 2 attempts
- Workers: 1 (sequential)
- GitHub Actions reporter enabled

## Debugging

```bash
# Debug mode (step through tests)
npx playwright test --debug

# Show browser console
npx playwright test --headed

# Generate trace
npx playwright show-trace trace.zip
```

## Environment Variables

- `FRONTEND_URL`: Frontend base URL (default: `http://localhost:5173`)
- `API_BASE_URL`: Backend API URL (default: `http://localhost:3000/api`)
- `CI`: Set to `true` in CI environments

## Best Practices

1. **Use API login for faster setup** - Use `loginViaAPI()` for tests that don't need to test login flow
2. **Use UI login for auth tests** - Use `loginViaUI()` when testing authentication
3. **Skip tests gracefully** - Use `test.skip()` when features aren't available
4. **Wait for elements** - Always use `await expect().toBeVisible()` instead of fixed timeouts
5. **Clean up state** - Clear localStorage/auth state in `beforeEach`

## Troubleshooting

### Backend not running
```bash
cd backend && npm run dev
```

### Frontend not running
```bash
cd frontend && npm run dev
```

### Tests timing out
- Check if servers are running
- Increase timeout in `playwright.config.ts`
- Check network connectivity

### Authentication failures
- Verify test users exist in database
- Check backend auth endpoints are working
- Verify JWT secret is configured

