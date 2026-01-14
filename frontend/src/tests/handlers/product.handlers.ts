/**
 * MSW Handlers for Product API
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = 'http://localhost:3000/api';

export const productHandlers = [
  // POST /customers/:id/products
  http.post(`${API_BASE_URL}/customers/:id/products`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const body = await request.json() as any;

    // Validation
    if (!body.productId) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            productId: 'Product ID is required',
          },
        },
        { status: 422 }
      );
    }

    if (!body.startDate) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            startDate: 'Start date is required',
          },
        },
        { status: 422 }
      );
    }

    // Mock 404 if customer not found
    if (id === 'non-existent') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Customer not found',
        },
        { status: 404 }
      );
    }

    // Calculate expiry date (mock - backend would do this)
    const startDate = new Date(body.startDate);
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + 12); // Default 12 months

    // Return assigned product
    return HttpResponse.json({
      success: true,
      data: {
        productName: 'Premium Support',
        expiryDate: expiryDate.toISOString(),
        status: 'ACTIVE',
      },
      message: 'Product assigned successfully',
    });
  }),
];

