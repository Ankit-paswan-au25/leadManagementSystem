import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Set environment variable for Jest tests (used by services that check process.env first)
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';

// MSW setup - conditionally load if available
let server: any = null;
try {
  // Dynamic import for MSW to avoid issues if not available
  const mswNode = require('msw/node');
  const { leadsHandlers } = require('./handlers/leads.handlers');
  const { ownershipHandlers } = require('./handlers/ownership.handlers');
  const { notificationHandlers } = require('./handlers/notification.handlers');
  const { customerHandlers } = require('./handlers/customer.handlers');
  const { productHandlers } = require('./handlers/product.handlers');
  const { zohoHandlers } = require('./handlers/zoho.handlers');
  const { linkedinHandlers } = require('./handlers/linkedin.handlers');
  const { authHandlers } = require('./handlers/auth.handlers');
  if (mswNode.setupServer && leadsHandlers) {
    server = mswNode.setupServer(
      ...leadsHandlers,
      ...ownershipHandlers,
      ...notificationHandlers,
      ...customerHandlers,
      ...productHandlers,
      ...zohoHandlers,
      ...linkedinHandlers,
      ...authHandlers
    );
  }
} catch (error) {
  // MSW not available - tests will use service mocks instead
  console.warn('MSW setup skipped - using service mocks');
}

// Setup MSW server for API mocking (if available)
if (server) {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
