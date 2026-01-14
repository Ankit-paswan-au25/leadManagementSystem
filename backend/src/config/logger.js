const winston = require('winston');
const config = require('./env');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [];

if (config.env === 'development') {
  // Development: Console with colors
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logLevel,
    })
  );
} else {
  // Production: Structured JSON logs
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: config.logLevel,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'sales-management-api' },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create stream for Express morgan-like logging (if needed later)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;

