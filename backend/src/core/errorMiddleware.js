const ApiError = require('./ApiError');
const ApiResponse = require('./ApiResponse');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * Central Error Handling Middleware
 * Handles all errors in the application
 * Different behavior for dev vs prod
 */
const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
    },
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = ApiError.notFound(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = ApiError.badRequest(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
    const message = 'Validation Error';
    error = ApiError.validationError(message, errors);
  }

  // JWT errors (for future use)
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = ApiError.unauthorized(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = ApiError.unauthorized(message);
  }

  // Prepare response
  const response = {
    status: 'error',
    message: error.message || 'Internal Server Error',
  };

  // Add errors object if validation error
  if (error.errors && Object.keys(error.errors).length > 0) {
    response.errors = error.errors;
  }

  // Add stack trace in development only
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  // Send response
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(response);
};

module.exports = errorMiddleware;

