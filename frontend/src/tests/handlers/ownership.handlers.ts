/**
 * MSW Handlers for Ownership API
 */

import { http, HttpResponse, delay } from 'msw';
import type { OwnershipRequest } from '../../types/ownership.types';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock ownership requests data
const mockOwnershipRequests: OwnershipRequest[] = [
  {
    id: 'req-1',
    leadId: '1',
    leadName: 'John Doe',
    currentOwnerId: 'admin-1',
    currentOwnerName: 'Admin User',
    requestedOwnerId: 'user-1',
    requestedOwnerName: 'Regular User',
    requestedById: 'admin-1',
    requestedByName: 'Admin User',
    status: 'PENDING',
    requestedAt: '2024-01-15T10:00:00Z',
    reason: 'Better fit for user team',
  },
  {
    id: 'req-2',
    leadId: '2',
    leadName: 'Jane Smith',
    currentOwnerId: 'user-1',
    currentOwnerName: 'Regular User',
    requestedOwnerId: 'admin-1',
    requestedOwnerName: 'Admin User',
    requestedById: 'user-1',
    requestedByName: 'Regular User',
    status: 'PENDING',
    requestedAt: '2024-01-16T14:00:00Z',
  },
];

export const ownershipHandlers = [
  // POST /leads/:id/owner-change-request
  http.post(`${API_BASE_URL}/leads/:id/owner-change-request`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const body = await request.json() as any;

    // Validation
    if (!body.requestedOwnerId) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            requestedOwnerId: 'Requested owner is required',
          },
        },
        { status: 422 }
      );
    }

    // Mock 403 if not current owner (simplified - in real app, backend checks)
    if (id === '999') {
      return HttpResponse.json(
        {
          success: false,
          message: 'You are not the current owner of this lead',
        },
        { status: 403 }
      );
    }

    // Create request
    const newRequest: OwnershipRequest = {
      id: `req-${mockOwnershipRequests.length + 1}`,
      leadId: id as string,
      leadName: 'Test Lead',
      currentOwnerId: 'admin-1',
      currentOwnerName: 'Current Owner',
      requestedOwnerId: body.requestedOwnerId,
      requestedOwnerName: body.requestedOwnerId === 'admin-1' ? 'Admin User' : 'Regular User',
      requestedById: 'user-1',
      requestedByName: 'Current User',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      reason: body.reason,
    };

    return HttpResponse.json({
      success: true,
      data: newRequest,
      message: 'Ownership change request submitted successfully',
    });
  }),

  // GET /ownership/requests
  http.get(`${API_BASE_URL}/ownership/requests`, async () => {
    await delay(100);

    return HttpResponse.json({
      success: true,
      data: mockOwnershipRequests.filter((req) => req.status === 'PENDING'),
    });
  }),

  // POST /ownership/requests/:leadId/approve
  http.post(`${API_BASE_URL}/ownership/requests/:leadId/approve`, async ({ params }) => {
    await delay(100);
    const { leadId } = params;

    const request = mockOwnershipRequests.find((r) => r.leadId === leadId && r.status === 'PENDING');

    if (!request) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Ownership request not found',
        },
        { status: 404 }
      );
    }

    // Approve request
    const approvedRequest: OwnershipRequest = {
      ...request,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      data: approvedRequest,
      message: 'Ownership request approved successfully',
    });
  }),

  // POST /ownership/requests/:leadId/reject
  http.post(`${API_BASE_URL}/ownership/requests/:leadId/reject`, async ({ params, request }) => {
    await delay(100);
    const { leadId } = params;
    const body = await request.json() as any;

    const ownershipRequest = mockOwnershipRequests.find(
      (r) => r.leadId === leadId && r.status === 'PENDING'
    );

    if (!ownershipRequest) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Ownership request not found',
        },
        { status: 404 }
      );
    }

    // Reject request
    const rejectedRequest: OwnershipRequest = {
      ...ownershipRequest,
      status: 'REJECTED',
      reviewedAt: new Date().toISOString(),
      rejectionReason: body.reason,
    };

    return HttpResponse.json({
      success: true,
      data: rejectedRequest,
      message: 'Ownership request rejected successfully',
    });
  }),
];

