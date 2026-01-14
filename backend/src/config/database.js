const mongoose = require('mongoose');
const config = require('./env');
const logger = require('./logger');

const connectDatabase = async () => {
  try {
    const options = {
      // Remove deprecated options, use modern defaults
    };

    await mongoose.connect(config.mongoUri, options);

    logger.info(`MongoDB connected successfully - ${config.mongoUri}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Handle app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;

