# Sales Management System - Backend

Production-ready Node.js backend foundation with Express, MongoDB, and structured logging.

## Project Structure

```
src/
 ├─ app.js                 # Express app configuration
 ├─ server.js              # Server entry point
 ├─ config/
 │   ├─ env.js            # Environment configuration
 │   ├─ logger.js         # Winston logger setup
 │   └─ database.js       # MongoDB connection
 ├─ core/
 │   ├─ asyncHandler.js   # Async route wrapper (HOF)
 │   ├─ ApiError.js       # Custom error class
 │   ├─ ApiResponse.js    # Central response class
 │   └─ errorMiddleware.js # Error handling middleware
 ├─ routes/
 │   └─ health.routes.js  # Health check route
 ├─ tests/
 │   └─ health.test.js    # Health check tests
 └─ utils/                # Utility functions
```

## Environment Setup

Create environment files:

- `.env.development` - Development environment
- `.env.production` - Production environment

Required environment variables:

```env
NODE_ENV=development|production
PORT=3000
MONGO_URI=mongodb://localhost:27017/salesManagement_dev
JWT_SECRET=your_secret_key
LOG_LEVEL=debug|info|warn|error
```

## Installation

```bash
npm install
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run prod` - Start production server
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run seed:users` - Seed default users (admin@test.com and user@test.com)
- `npm run seed:users:reset` - Reset passwords for existing seeded users

## Development vs Production

### Development Mode
- Full error stack traces in responses
- Console logs with colors
- Verbose debug logs

### Production Mode
- No stack traces in responses
- Safe error messages only
- Structured JSON logs

## API Endpoints

### Health Check
- `GET /health` - Returns server status, environment, and timestamp

## Database Seeding

Seed default users for testing and development:

```bash
# Create default users (skips if they already exist)
npm run seed:users

# Reset passwords for existing users
npm run seed:users:reset
```

**Default Users:**
- **Admin**: `admin@test.com` / `Admin123!` (ADMIN role, ACTIVE status)
- **User**: `user@test.com` / `User123!` (USER role, ACTIVE status)

## Testing

Tests are written using Jest and Supertest:

```bash
npm test
```

## Core Features

- **Async Handler**: Wraps async routes, eliminates try-catch blocks
- **Error Middleware**: Centralized error handling with dev/prod behavior
- **Response Class**: Standardized API responses
- **Structured Logging**: Winston logger with environment-aware formatting
- **MongoDB Connection**: Mongoose setup with error handling

## Next Steps

This is Step 1 - Foundation Setup. Wait for next instructions to add:
- Authentication (JWT)
- Business logic
- Database schemas
- Additional routes

