import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { authStore } from '../store/auth.store';
import { mapErrorToUserMessage } from '../utils/errorMapper';
import { globalAlerts } from '../utils/globalAlerts';

/**
 * API Response format from backend
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Get base URL from environment
 * Uses process.env (set in Jest setup) or defaults for Vite
 */
const getBaseURL = (): string => {
  // Check process.env first (works in both Node/Jest and can be set for Vite)
  if (typeof process !== 'undefined' && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  // Default fallback (use same-origin proxy on prod)
  return '/api';
};

/**
 * Create axios instance with base configuration
 */
const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getBaseURL(),
    timeout: 15000, // 15 seconds - reasonable timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Track if we're currently refreshing to prevent multiple refresh attempts
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  // Request interceptor: Attach auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = authStore.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: Handle errors globally and refresh token on 401
  client.interceptors.response.use(
    (response) => {
      // Return response data directly if it's already in ApiResponse format
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 (Unauthorized) - Try to refresh token
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return client(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshed = await authStore.refreshSession();
          if (refreshed) {
            const newToken = authStore.getToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            processQueue(null, newToken);
            // Retry the original request
            return client(originalRequest);
          } else {
            // Refresh failed - logout and show message
            processQueue(new Error('Token refresh failed'));
            authStore.logout();
            globalAlerts.showInfo('Session expired. Please log in again.');
            return Promise.reject(error);
          }
        } catch (refreshError) {
          processQueue(refreshError);
          authStore.logout();
          globalAlerts.showInfo('Session expired. Please log in again.');
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle other errors
      handleResponseError(error);
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Handle response errors globally
 */
const handleResponseError = (error: AxiosError): void => {
  if (!error.response) {
    // Network error or timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      globalAlerts.showError('Request timed out. Please try again.');
    } else {
      globalAlerts.showError('Network issue. Please check your connection and try again.');
    }
    return;
  }

  const status = error.response.status;
  const userMessage = mapErrorToUserMessage(error);

  // Handle 401 (Unauthorized) - Already handled in interceptor with refresh token
  // This is a fallback if refresh token flow didn't work
  if (status === 401) {
    // Don't logout here - interceptor handles it
    return;
  }

  // Handle 429 (Too Many Requests) - Rate limiting
  if (status === 429) {
    globalAlerts.showInfo('Too many requests. Please slow down.');
    return;
  }

  // Handle 403 (Forbidden) - Show error alert
  if (status === 403) {
    globalAlerts.showError(userMessage);
    return;
  }

  // Handle 500 (Internal Server Error) - Show error alert
  if (status === 500) {
    globalAlerts.showError(userMessage);
    return;
  }

  // For other errors (400, 404, 409, etc.), show error alert
  // Components can also catch these if they need custom handling
  globalAlerts.showError(userMessage);
};

/**
 * HTTP Client instance
 */
export const httpClient = createHttpClient();

/**
 * Generic GET request
 */
export const get = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  const response = await httpClient.get<ApiResponse<T>>(url, config);
  return response.data;
};

/**
 * Generic POST request
 */
export const post = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await httpClient.post<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Generic PUT request
 */
export const put = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await httpClient.put<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Generic PATCH request
 */
export const patch = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await httpClient.patch<ApiResponse<T>>(url, data, config);
  return response.data;
};

/**
 * Generic DELETE request
 */
export const del = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  const response = await httpClient.delete<ApiResponse<T>>(url, config);
  return response.data;
};

export default httpClient;
