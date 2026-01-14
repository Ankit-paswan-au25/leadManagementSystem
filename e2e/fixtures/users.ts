/**
 * Test User Fixtures
 * Predefined users for E2E testing
 */

export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
  name?: string;
}

/**
 * Admin user for testing admin-only features
 */
export const adminUser: TestUser = {
  email: 'admin@test.com',
  password: 'Admin123!',
  role: 'ADMIN',
  name: 'Admin User',
};

/**
 * Regular user for testing user-level features
 */
export const regularUser: TestUser = {
  email: 'user@test.com',
  password: 'User123!',
  role: 'USER',
  name: 'Regular User',
};

/**
 * Test users array for easy iteration
 */
export const testUsers = {
  admin: adminUser,
  user: regularUser,
};

