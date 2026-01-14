/**
 * MSW Handlers for Leads API
 */

import { http, HttpResponse, delay } from 'msw';
import type { Lead } from '../../types/lead.types';
import type { LeadActivity } from '../../types/activity.types';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock leads data
const mockLeads: Lead[] = [
  {
    id: '1',
    leadName: 'John Doe',
    companyName: 'Acme Corp',
    email: 'john.doe@acme.com',
    phone: '+1-555-0100',
    status: 'NEW',
    ownerName: 'Admin User',
    ownerId: 'admin-1',
    nextFollowUpAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '2',
    leadName: 'Jane Smith',
    companyName: 'Tech Solutions Inc',
    email: 'jane.smith@techsolutions.com',
    phone: '+1-555-0200',
    status: 'CONTACTED',
    ownerName: 'Regular User',
    ownerId: 'user-1',
    nextFollowUpAt: '2024-01-16T14:00:00Z',
    createdAt: '2024-01-11T09:00:00Z',
    updatedAt: '2024-01-12T11:00:00Z',
  },
  {
    id: '3',
    leadName: 'Bob Johnson',
    companyName: 'Global Industries',
    email: 'bob.johnson@global.com',
    phone: '+1-555-0300',
    status: 'QUALIFIED',
    ownerName: 'Admin User',
    ownerId: 'admin-1',
    nextFollowUpAt: '2024-01-17T09:00:00Z',
    createdAt: '2024-01-08T10:00:00Z',
    updatedAt: '2024-01-13T15:00:00Z',
  },
];

// Mock activities data
const mockActivities: Record<string, LeadActivity[]> = {
  '1': [
    {
      id: 'act-1-1',
      leadId: '1',
      activityType: 'LEAD_CREATED',
      performedBy: 'admin-1',
      performedByType: 'ADMIN',
      performedByName: 'Admin User',
      ownerAtThatTime: 'admin-1',
      ownerAtThatTimeName: 'Admin User',
      timestamp: '2024-01-10T08:00:00Z',
      createdAt: '2024-01-10T08:00:00Z',
      metadata: 'Lead created via web form',
    },
    {
      id: 'act-1-2',
      leadId: '1',
      activityType: 'EMAIL_SENT',
      performedBy: 'admin-1',
      performedByType: 'ADMIN',
      performedByName: 'Admin User',
      ownerAtThatTime: 'admin-1',
      ownerAtThatTimeName: 'Admin User',
      timestamp: '2024-01-11T10:30:00Z',
      createdAt: '2024-01-11T10:30:00Z',
      metadata: 'Initial outreach email',
    },
    {
      id: 'act-1-3',
      leadId: '1',
      activityType: 'FOLLOW_UP_SCHEDULED',
      performedBy: 'SYSTEM',
      performedByType: 'SYSTEM',
      performedByName: 'System',
      ownerAtThatTime: 'admin-1',
      ownerAtThatTimeName: 'Admin User',
      timestamp: '2024-01-11T10:35:00Z',
      createdAt: '2024-01-11T10:35:00Z',
      metadata: 'Next follow-up scheduled for Jan 15, 2024',
    },
  ],
  '2': [
    {
      id: 'act-2-1',
      leadId: '2',
      activityType: 'LEAD_CREATED',
      performedBy: 'user-1',
      performedByType: 'USER',
      performedByName: 'Regular User',
      ownerAtThatTime: 'user-1',
      ownerAtThatTimeName: 'Regular User',
      timestamp: '2024-01-11T09:00:00Z',
      createdAt: '2024-01-11T09:00:00Z',
    },
    {
      id: 'act-2-2',
      leadId: '2',
      activityType: 'EMAIL_SENT',
      performedBy: 'user-1',
      performedByType: 'USER',
      performedByName: 'Regular User',
      ownerAtThatTime: 'user-1',
      ownerAtThatTimeName: 'Regular User',
      timestamp: '2024-01-12T11:00:00Z',
      createdAt: '2024-01-12T11:00:00Z',
      metadata: 'Follow-up email sent',
    },
    {
      id: 'act-2-3',
      leadId: '2',
      activityType: 'CLIENT_REPLIED',
      performedBy: 'SYSTEM',
      performedByType: 'SYSTEM',
      performedByName: 'System',
      ownerAtThatTime: 'user-1',
      ownerAtThatTimeName: 'Regular User',
      timestamp: '2024-01-12T14:30:00Z',
      createdAt: '2024-01-12T14:30:00Z',
      metadata: 'Client replied to email',
    },
    {
      id: 'act-2-4',
      leadId: '2',
      activityType: 'STATUS_CHANGED',
      performedBy: 'user-1',
      performedByType: 'USER',
      performedByName: 'Regular User',
      ownerAtThatTime: 'user-1',
      ownerAtThatTimeName: 'Regular User',
      timestamp: '2024-01-12T15:00:00Z',
      createdAt: '2024-01-12T15:00:00Z',
      metadata: 'Status changed from NEW to CONTACTED',
    },
  ],
};

export const leadsHandlers = [
  // GET /leads
  http.get(`${API_BASE_URL}/leads`, async ({ request }) => {
    await delay(100); // Simulate network delay
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const ownerId = url.searchParams.get('ownerId');

    let filteredLeads = [...mockLeads];

    // Apply status filter
    if (status) {
      filteredLeads = filteredLeads.filter((lead) => lead.status === status);
    }

    // Apply owner filter
    if (ownerId) {
      filteredLeads = filteredLeads.filter((lead) => lead.ownerId === ownerId);
    }

    return HttpResponse.json({
      success: true,
      data: filteredLeads,
    });
  }),

  // GET /leads/:id
  http.get(`${API_BASE_URL}/leads/:id`, async ({ params }) => {
    await delay(100);
    const { id } = params;

    const lead = mockLeads.find((l) => l.id === id);

    if (!lead) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: lead,
    });
  }),

  // GET /leads/:id/activities
  http.get(`${API_BASE_URL}/leads/:id/activities`, async ({ params }) => {
    await delay(100);
    const { id } = params;

    const activities = mockActivities[id as string] || [];

    return HttpResponse.json({
      success: true,
      data: activities,
    });
  }),

  // POST /leads
  http.post(`${API_BASE_URL}/leads`, async ({ request }) => {
    await delay(100); // Simulate network delay
    const body = await request.json() as any;

    // Validation errors
    if (!body.leadName) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            leadName: 'Lead name is required',
          },
        },
        { status: 422 }
      );
    }

    if (!body.email) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            email: 'Email is required',
          },
        },
        { status: 422 }
      );
    }

    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            email: 'Invalid email format',
          },
        },
        { status: 422 }
      );
    }

    // Create new lead
    const newLead: Lead = {
      id: String(mockLeads.length + 1),
      leadName: body.leadName,
      companyName: body.companyName || '',
      email: body.email,
      phone: body.phone || '',
      status: 'NEW',
      ownerName: body.ownerId === 'admin-1' ? 'Admin User' : 'Regular User',
      ownerId: body.ownerId || 'user-1',
      nextFollowUpAt: null, // Will be calculated by backend
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      data: newLead,
      message: 'Lead created successfully',
    });
  }),
];
