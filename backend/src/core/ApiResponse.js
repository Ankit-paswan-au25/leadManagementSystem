/**
 * Central Response Class
 * Standardized API response format
 * No direct res.status().json() calls elsewhere
 */
class ApiResponse {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {string} message - Success message
   * @param {*} data - Response data
   */
  static success(res, statusCode = 200, message = 'Success', data = null) {
    const response = {
      status: 'success',
      message,
      ...(data !== null && { data }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {*} errors - Additional error details (optional)
   */
  static error(res, statusCode, message, errors = null) {
    const response = {
      status: 'error',
      message,
      ...(errors && { errors }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Object} errors - Field-wise validation errors
   * @param {string} message - Error message (default: 'Validation Failed')
   */
  static validationError(res, errors, message = 'Validation Failed') {
    return this.error(res, 422, message, errors);
  }

  /**
   * Send unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Error message (default: 'Unauthorized')
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, 401, message);
  }

  /**
   * Send forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Error message (default: 'Forbidden')
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, 403, message);
  }

  /**
   * Send not found response
   * @param {Object} res - Express response object
   * @param {string} message - Error message (default: 'Not Found')
   */
  static notFound(res, message = 'Not Found') {
    return this.error(res, 404, message);
  }
}

module.exports = ApiResponse;

