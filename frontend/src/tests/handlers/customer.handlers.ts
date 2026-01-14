/**
 * MSW Handlers for Customer API
 */

import { http, HttpResponse, delay } from 'msw';
import type { Customer, CustomerProduct } from '../../types/customer.types';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock customers data
const mockCustomers: Customer[] = [
  {
    id: '1',
    customerName: 'John Doe',
    companyName: 'Acme Corp',
    primaryEmail: 'john.doe@acme.com',
    phone: '+1-555-0100',
    status: 'ACTIVE',
    accountOwnerName: 'Admin User',
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    companyName: 'Tech Solutions Inc',
    primaryEmail: 'jane.smith@techsolutions.com',
    status: 'ACTIVE',
    accountOwnerName: 'Regular User',
  },
  {
    id: '3',
    customerName: 'Bob Johnson',
    companyName: 'Global Industries',
    primaryEmail: 'bob.johnson@global.com',
    phone: '+1-555-0300',
    status: 'INACTIVE',
    accountOwnerName: 'Admin User',
  },
];

// Mock customer products data
const mockCustomerProducts: Record<string, CustomerProduct[]> = {
  '1': [
    {
      productName: 'Premium Support',
      category: 'Support',
      startDate: '2024-01-01T00:00:00Z',
      expiryDate: '2024-12-31T23:59:59Z',
      status: 'ACTIVE',
      daysRemaining: 45,
    },
    {
      productName: 'Enterprise License',
      category: 'License',
      startDate: '2023-06-01T00:00:00Z',
      expiryDate: '2024-02-15T23:59:59Z',
      status: 'ACTIVE',
      daysRemaining: 15,
    },
  ],
  '2': [
    {
      productName: 'Basic Plan',
      category: 'Subscription',
      startDate: '2024-01-01T00:00:00Z',
      expiryDate: '2024-01-10T23:59:59Z',
      status: 'EXPIRED',
      daysRemaining: -5,
    },
  ],
  '3': [],
};

export const customerHandlers = [
  // GET /customers
  http.get(`${API_BASE_URL}/customers`, async () => {
    await delay(100);

    return HttpResponse.json({
      success: true,
      data: mockCustomers,
    });
  }),

  // GET /customers/:id
  http.get(`${API_BASE_URL}/customers/:id`, async ({ params }) => {
    await delay(100);
    const { id } = params;
    const customer = mockCustomers.find((c) => c.id === id);

    if (!customer) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Customer not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: customer,
    });
  }),

  // GET /customers/:id/products
  http.get(`${API_BASE_URL}/customers/:id/products`, async ({ params }) => {
    await delay(100);
    const { id } = params;
    const products = mockCustomerProducts[id as string] || [];

    return HttpResponse.json({
      success: true,
      data: products,
    });
  }),
];

