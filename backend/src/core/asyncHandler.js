/**
 * Higher Order Function to wrap async route handlers
 * Eliminates need for try-catch blocks in controllers
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;

