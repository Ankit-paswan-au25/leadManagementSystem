require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/salesManagement_dev',
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  logLevel: process.env.LOG_LEVEL || 'info',
  // Outlook/Email Configuration
  outlookClientId: process.env.OUTLOOK_CLIENT_ID || '',
  outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
  outlookTenantId: process.env.OUTLOOK_TENANT_ID || '',
  outlookUserEmail: process.env.OUTLOOK_USER_EMAIL || '',
  outlookRefreshToken: process.env.OUTLOOK_REFRESH_TOKEN || '',
  // Slack Configuration
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  slackBotToken: process.env.SLACK_BOT_TOKEN || '',
  slackAdminChannel: process.env.SLACK_ADMIN_CHANNEL || '#admin',
};

// Validate required env vars
const requiredEnvVars = ['NODE_ENV', 'PORT', 'MONGO_URI', 'JWT_SECRET', 'LOG_LEVEL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && config.env !== 'test') {
  console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
}

module.exports = config;

