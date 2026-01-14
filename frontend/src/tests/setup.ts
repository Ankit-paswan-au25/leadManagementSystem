import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Polyfill for TextEncoder/TextDecoder (required by some libraries in Node.js test environment)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for Fetch API (required by MSW in Node.js test environment)
if (typeof global.Response === 'undefined') {
  // Minimal polyfills for MSW
  global.Response = class Response {
    constructor(public body?: any, public init?: any) {}
    static error() { return new Response(); }
    static redirect() { return new Response(); }
    clone() { return this; }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    blob() { return Promise.resolve(new Blob()); }
    formData() { return Promise.resolve(new FormData()); }
    json() { return Promise.resolve({}); }
    text() { return Promise.resolve(''); }
  } as any;
  global.Request = class Request {
    constructor(public url: string, public init?: any) {}
    clone() { return this; }
  } as any;
  global.Headers = class Headers {
    constructor(public init?: any) {}
    append() {}
    delete() {}
    get() { return null; }
    has() { return false; }
    set() {}
  } as any;
}

// Mock BroadcastChannel (required by MSW WebSocket support)
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(public name: string) {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  } as any;
}

// Mock WritableStream (required by MSW SSE support)
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = class WritableStream {
    constructor(public underlyingSink?: any, public strategy?: any) {}
    getWriter() {
      return {
        write: () => Promise.resolve(),
        close: () => Promise.resolve(),
        abort: () => Promise.resolve(),
        releaseLock: () => {},
      };
    }
    close() { return Promise.resolve(); }
    abort() { return Promise.resolve(); }
  } as any;
}

// Mock ReadableStream (required by MSW)
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor(public underlyingSource?: any, public strategy?: any) {}
    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        cancel: () => Promise.resolve(),
        releaseLock: () => {},
      };
    }
    cancel() { return Promise.resolve(); }
  } as any;
}

// Set environment variable for Jest tests (used by services that check process.env first)
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';

// MSW setup - conditionally load if available
export let server: any = null;

// Setup MSW server for API mocking (if available)
beforeAll(async () => {
  try {
    // Dynamic import for MSW to avoid issues if not available
    const mswNode = await import('msw/node');
    const { leadsHandlers } = await import('./handlers/leads.handlers');
    const { ownershipHandlers } = await import('./handlers/ownership.handlers');
    const { notificationHandlers } = await import('./handlers/notification.handlers');
    const { customerHandlers } = await import('./handlers/customer.handlers');
    const { productHandlers } = await import('./handlers/product.handlers');
    const { zohoHandlers } = await import('./handlers/zoho.handlers');
    const { linkedinHandlers } = await import('./handlers/linkedin.handlers');
    const { authHandlers } = await import('./handlers/auth.handlers');
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
      server.listen({ onUnhandledRequest: 'error' });
    }
  } catch (error) {
    // MSW not available - tests will use service mocks instead
    console.warn('MSW setup skipped - using service mocks');
  }
});

afterEach(() => {
  if (server) {
    server.resetHandlers();
  }
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

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
