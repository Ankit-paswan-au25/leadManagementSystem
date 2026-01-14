const express = require('express');
const config = require('./config/env');
const logger = require('./config/logger');
const errorMiddleware = require('./core/errorMiddleware');
const ApiError = require('./core/ApiError');
const cors = require('cors');

// Import routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const leadRoutes = require('./routes/lead.routes');
const ownershipRoutes = require('./routes/ownership.routes');
const customerRoutes = require('./routes/customer.routes');
const productRoutes = require('./routes/product.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityRoutes = require('./routes/activity.routes');

// Create Express app
const app = express();
app.use(cors());
// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (simple)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/ownership', ownershipRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);

// 404 handler
app.use((req, res, next) => {
  next(ApiError.notFound(`Not Found - ${req.originalUrl}`));
});

// Error handling middleware (must be last)
app.use(errorMiddleware);

module.exports = app;

