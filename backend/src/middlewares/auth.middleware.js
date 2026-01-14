const ApiError = require('../core/ApiError');
const { verifyToken } = require('../utils/token');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 * 
 * Reads token from: Authorization header (Bearer <token>)
 * Attaches: req.user = { userId, role }
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token) {
      throw ApiError.unauthorized('No token provided');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }

    // If it's already an ApiError, pass it through
    if (error.isApiError) {
      return next(error);
    }

    // Otherwise, return unauthorized
    return next(ApiError.unauthorized('Authentication failed'));
  }
};

module.exports = authMiddleware;

