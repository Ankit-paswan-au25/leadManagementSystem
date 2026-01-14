/**
 * Custom API Error Class
 * Extends native Error class with status code and operational flag
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.isApiError = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a bad request error (400)
   */
  static badRequest(message = 'Bad Request') {
    return new ApiError(400, message);
  }

  /**
   * Create an unauthorized error (401)
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  /**
   * Create a forbidden error (403)
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  /**
   * Create a not found error (404)
   */
  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  /**
   * Create a validation error (422)
   */
  static validationError(message = 'Validation Error', errors = {}) {
    const error = new ApiError(422, message);
    error.errors = errors;
    return error;
  }

  /**
   * Create a conflict error (409)
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  /**
   * Create an internal server error (500)
   */
  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;

