/**
 * Central error mapper utility
 * Maps technical errors to user-friendly messages
 * Future-ready for API integration
 */

interface ErrorMapping {
  code?: string | number;
  message?: string;
  defaultMessage: string;
}

const errorMappings: ErrorMapping[] = [
  {
    code: 401,
    defaultMessage: 'Session expired. Please login again.',
  },
  {
    code: 403,
    defaultMessage: "You don't have permission to perform this action.",
  },
  {
    code: 404,
    defaultMessage: 'The requested resource was not found.',
  },
  {
    code: 500,
    defaultMessage: 'Something went wrong on our end. Please try again later.',
  },
  {
    code: 'NETWORK_ERROR',
    defaultMessage: 'Network error. Please check your connection and try again.',
  },
  {
    code: 'TIMEOUT',
    defaultMessage: 'Request timed out. Please try again.',
  },
  {
    message: 'Unauthorized',
    defaultMessage: 'You are not authorized to perform this action.',
  },
  {
    message: 'Forbidden',
    defaultMessage: 'Access denied.',
  },
];

/**
 * Map an error to a user-friendly message
 * Supports AxiosError and regular Error objects
 */
export const mapErrorToUserMessage = (error: unknown): string => {
  // Handle AxiosError (has response property)
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as any;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const mapping = errorMappings.find((m) => m.code === status);
      if (mapping) {
        return mapping.defaultMessage;
      }
    }
  }

  if (error instanceof Error) {
    // Check for specific error messages
    for (const mapping of errorMappings) {
      if (mapping.message && error.message.includes(mapping.message)) {
        return mapping.defaultMessage;
      }
    }

    // Check for HTTP status codes in error message
    const statusCodeMatch = error.message.match(/\b(401|403|404|500)\b/);
    if (statusCodeMatch) {
      const code = parseInt(statusCodeMatch[0]);
      const mapping = errorMappings.find((m) => m.code === code);
      if (mapping) {
        return mapping.defaultMessage;
      }
    }

    // Return error message if it looks user-friendly
    if (error.message && !error.message.includes('Error:') && !error.message.includes('at ')) {
      return error.message;
    }
  }

  // Check for error objects with status codes
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    if (errorObj.status || errorObj.statusCode) {
      const code = errorObj.status || errorObj.statusCode;
      const mapping = errorMappings.find((m) => m.code === code);
      if (mapping) {
        return mapping.defaultMessage;
      }
    }
  }

  // Default fallback message
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('Network') ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    );
  }
  return false;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes('401') || error.message.includes('Unauthorized');
  }
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    return errorObj.status === 401 || errorObj.statusCode === 401;
  }
  return false;
};

