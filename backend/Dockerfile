# Backend Dockerfile
FROM node:18-alpine AS deps

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy dependencies and app code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Drop root privileges
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
# NODE_ENV is already set via environment variables in docker-compose.yml
# So we can run node directly without needing cross-env (which is a devDependency)
CMD ["node", "src/server.js"]

