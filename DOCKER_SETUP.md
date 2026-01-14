# Docker Setup for Sales Management System

## ✅ Docker Compatibility Assessment

**Both your backend AND frontend CAN run on Docker!** ✅

### Backend
You already have:
- ✅ `backend/Dockerfile` (production)
- ✅ `backend/Dockerfile.dev` (development)
- ✅ `backend/.dockerignore` (properly configured)
- ✅ Health check endpoint at `/health`

### Frontend
You already have:
- ✅ `frontend/Dockerfile` (production - multi-stage build with nginx)
- ✅ `frontend/Dockerfile.dev` (development - Vite dev server)
- ✅ `frontend/.dockerignore` (properly configured)
- ✅ `frontend/nginx.conf` (nginx configuration for SPA)
- ✅ Environment variable support (`VITE_API_BASE_URL`)

## Quick Start

### Production Mode

```bash
# Build and run with docker-compose
docker-compose up -d

# Or build and run manually
cd backend
docker build -t sales-management-backend .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MONGO_URI=mongodb://mongodb:27017/salesManagement_prod \
  -e JWT_SECRET=your_secret_key \
  -e LOG_LEVEL=info \
  sales-management-backend
```

### Development Mode

```bash
# Run with docker-compose (includes hot reload)
docker-compose -f docker-compose.dev.yml up

# Or build and run manually
cd backend
docker build -f Dockerfile.dev -t sales-management-backend-dev .
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e PORT=3000 \
  -e MONGO_URI=mongodb://localhost:27017/salesManagement_dev \
  -e JWT_SECRET=dev_secret_key \
  -e LOG_LEVEL=debug \
  -v $(pwd)/src:/app/src \
  sales-management-backend-dev
```

## Environment Variables

Required environment variables:

```env
NODE_ENV=production|development
PORT=3000
MONGO_URI=mongodb://mongodb:27017/salesManagement_prod
JWT_SECRET=your_secret_key_here
LOG_LEVEL=info|debug|warn|error
```

Optional (for email/Slack integration):
```env
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=
OUTLOOK_USER_EMAIL=
OUTLOOK_REFRESH_TOKEN=
SLACK_WEBHOOK_URL=
SLACK_BOT_TOKEN=
SLACK_ADMIN_CHANNEL=#admin
```

## Docker Compose Services

### Production (`docker-compose.yml`)
- **mongodb**: MongoDB 7.0 on port 27017
- **backend**: Backend service on port 3000
- **frontend**: Frontend service (nginx) on port 80

### Development (`docker-compose.dev.yml`)
- **mongodb**: MongoDB 7.0 on port 27017
- **backend**: Backend service with hot reload (nodemon) on port 3000
- **frontend**: Frontend service with hot reload (Vite) on port 5173

## Important Notes

1. **MongoDB Connection**: In Docker Compose, use `mongodb://mongodb:27017/...` (service name), not `localhost`
2. **Data Persistence**: MongoDB data is stored in Docker volumes (`mongodb_data` or `mongodb_data_dev`)
3. **Health Checks**: All services have health checks configured
4. **Port Mapping**: 
   - Backend: `3000:3000`
   - Frontend (prod): `80:80` (nginx)
   - Frontend (dev): `5173:5173` (Vite dev server)
   - MongoDB: `27017:27017`
5. **Frontend API URL**: The frontend is configured to connect to `http://localhost:3000/api` (backend service). This works because both containers are on the same Docker network and the backend is exposed on port 3000.

## Testing the Setup

```bash
# Start all services (production)
docker-compose up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test backend health endpoint
curl http://localhost:3000/health

# Test frontend (production)
# Open browser: http://localhost

# Start development services
docker-compose -f docker-compose.dev.yml up

# Test frontend (development)
# Open browser: http://localhost:5173

# Stop services
docker-compose down

# Remove volumes (careful - deletes data!)
docker-compose down -v
```

## Troubleshooting

### Backend can't connect to MongoDB
- Ensure MongoDB service is healthy: `docker-compose ps`
- Check MongoDB logs: `docker-compose logs mongodb`
- Verify MONGO_URI uses service name `mongodb`, not `localhost`

### Port already in use
- Change port mapping in docker-compose.yml: `"3001:3000"` for backend
- Or stop the process using port 3000

### Build fails
- Ensure Docker is running
- Check `backend/.dockerignore` is not excluding necessary files
- Verify `package.json` and `package-lock.json` exist

## Dockerfile Analysis

### Backend Dockerfiles
Your existing Dockerfiles are well-structured:
- ✅ Uses node:18-alpine (lightweight)
- ✅ Proper layer caching (package.json copied first)
- ✅ Health check configured
- ✅ Production dependencies only in production Dockerfile
- ✅ Proper .dockerignore to exclude unnecessary files

### Frontend Dockerfiles
Your frontend Dockerfiles are excellent:
- ✅ **Production**: Multi-stage build (build stage + nginx stage) - very efficient!
- ✅ Uses nginx:alpine for serving static files (lightweight and fast)
- ✅ Proper nginx configuration for SPA routing (React Router)
- ✅ Build-time environment variable support (`VITE_API_BASE_URL`)
- ✅ Health check configured
- ✅ **Development**: Uses Vite dev server with hot reload
- ✅ Volume mounting for development hot reload
- ✅ Proper .dockerignore to exclude dist and node_modules

## Frontend-Specific Notes

### Production Build
The frontend uses a multi-stage Docker build:
1. **Builder stage**: Builds the React app with Vite
2. **Production stage**: Serves the built files with nginx

This results in a very small final image (~25MB) compared to including Node.js.

### API Configuration
The frontend needs to know where the backend API is. In production:
- The `VITE_API_BASE_URL` is set at **build time** via Docker build args
- Default: `http://localhost:3000/api` (works for local Docker setup)
- **Important**: Since the frontend runs in the browser, API calls are made from the user's browser to the backend
- For local Docker: `http://localhost:3000/api` works because the backend is exposed on host port 3000
- For production deployment: Change the build arg to your actual backend URL (e.g., `https://api.yourdomain.com/api`)

**Example for production build:**
```bash
docker build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/api -t sales-management-frontend ./frontend
```

### Development Mode
In development mode:
- Vite dev server runs on port 5173
- Hot module replacement (HMR) is enabled
- Source files are mounted as volumes for instant updates
- API URL can be changed via environment variable
