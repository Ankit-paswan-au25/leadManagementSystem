/**
 * MSW Handlers for Auth API
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = 'http://localhost:3000/api';

export const authHandlers = [
  // POST /auth/refresh
  http.post(`${API_BASE_URL}/auth/refresh`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { refreshToken?: string };

    // Simulate validation error if no refreshToken
    if (!body.refreshToken || !body.refreshToken.trim()) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Refresh token is required',
        },
        { status: 400 }
      );
    }

    // Simulate expired/invalid refresh token
    if (body.refreshToken === 'expired_refresh_token' || body.refreshToken === 'invalid_refresh_token') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Invalid or expired refresh token',
        },
        { status: 401 }
      );
    }

    // Simulate successful refresh
    const newAccessToken = `new_access_token_${Date.now()}`;
    const newRefreshToken = `new_refresh_token_${Date.now()}`;

    return HttpResponse.json({
      success: true,
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        role: 'USER',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          role: 'USER',
        },
      },
    });
  }),

  // POST /auth/register
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { name?: string; email?: string; password?: string };

    // Simulate validation errors
    if (!body.name || !body.email || !body.password) {
      const errors: any = {};
      if (!body.name) errors.name = 'Name is required';
      if (!body.email) errors.email = 'Email is required';
      if (!body.password) errors.password = 'Password is required';
      
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors,
        },
        { status: 422 }
      );
    }

    // Simulate invalid email format
    if (!body.email.includes('@')) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            email: 'Please provide a valid email address',
          },
        },
        { status: 422 }
      );
    }

    // Simulate password too short
    if (body.password.length < 6) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: {
            password: 'Password must be at least 6 characters long',
          },
        },
        { status: 422 }
      );
    }

    // Simulate duplicate email
    if (body.email === 'existing@test.com') {
      return HttpResponse.json(
        {
          success: false,
          message: 'User with this email already exists',
        },
        { status: 409 }
      );
    }

    // Simulate successful registration
    return HttpResponse.json({
      success: true,
      message: 'Registration successful. Your account is pending activation by an administrator.',
      data: {
        user: {
          id: `user_${Date.now()}`,
          name: body.name,
          email: body.email.toLowerCase(),
          role: 'USER',
          status: 'PENDING',
        },
      },
    });
  }),
];

