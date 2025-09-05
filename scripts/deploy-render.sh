#!/bin/bash

# Render Deployment Script for Creator Hub
# This script helps prepare the Creator Hub application for Render deployment

set -e

echo "🎨 Creator Hub - Render Deployment Script"
echo "========================================="

# Create render.yaml for Infrastructure as Code
echo "📝 Creating Render configuration..."
cat > render.yaml << 'EOF'
services:
  # PostgreSQL Database
  - type: pserv
    name: creator-hub-db
    env: docker
    plan: free
    dockerfilePath: ./infra/Dockerfile.postgres
    envVars:
      - key: POSTGRES_DB
        value: creator_hub
      - key: POSTGRES_USER
        value: postgres
      - key: POSTGRES_PASSWORD
        generateValue: true

  # Backend API Service
  - type: web
    name: creator-hub-backend
    env: docker
    dockerfilePath: ./infra/Dockerfile.backend
    plan: free
    buildCommand: ""
    startCommand: ""
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: DATABASE_URL
        fromDatabase:
          name: creator-hub-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        fromService:
          type: web
          name: creator-hub-frontend
          property: host
    healthCheckPath: /health

  # Frontend Service
  - type: web
    name: creator-hub-frontend
    env: docker
    dockerfilePath: ./infra/Dockerfile.frontend
    plan: free
    buildCommand: ""
    startCommand: ""
    envVars:
      - key: VITE_API_URL
        fromService:
          type: web
          name: creator-hub-backend
          property: host
    healthCheckPath: /health

  # Redis Cache (Optional)
  - type: redis
    name: creator-hub-redis
    plan: free
    maxmemoryPolicy: allkeys-lru
EOF

echo "✅ Render configuration created"

# Create Render-specific Dockerfile for PostgreSQL
echo "🐘 Creating PostgreSQL Dockerfile for Render..."
cat > infra/Dockerfile.postgres << 'EOF'
FROM postgres:15-alpine

# Copy initialization script
COPY infra/init.sql /docker-entrypoint-initdb.d/

# Set default environment variables
ENV POSTGRES_DB=creator_hub
ENV POSTGRES_USER=postgres

EXPOSE 5432

CMD ["postgres"]
EOF

# Create deployment preparation script
echo "🔧 Creating deployment preparation..."
cat > scripts/prepare-render.sh << 'EOF'
#!/bin/bash

# Prepare application for Render deployment
echo "Preparing Creator Hub for Render deployment..."

# Install dependencies and build
echo "Installing backend dependencies..."
cd backend
npm ci --only=production
npx prisma generate
npm run build
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm ci --only=production
npm run build
cd ..

echo "✅ Application prepared for Render deployment"
EOF

chmod +x scripts/prepare-render.sh

# Create build scripts for Render
echo "🏗️ Creating build scripts..."
cat > scripts/render-build-backend.sh << 'EOF'
#!/bin/bash
set -e

echo "Building backend for Render..."
cd backend
npm ci
npx prisma generate
npm run build

echo "Running database migrations..."
npx prisma migrate deploy

echo "✅ Backend build completed"
EOF

cat > scripts/render-build-frontend.sh << 'EOF'
#!/bin/bash
set -e

echo "Building frontend for Render..."
cd frontend
npm ci
npm run build

echo "✅ Frontend build completed"
EOF

chmod +x scripts/render-build-backend.sh
chmod +x scripts/render-build-frontend.sh

# Create environment template
echo "📋 Creating environment template..."
cat > .env.render.example << 'EOF'
# Render Environment Variables Template
# Copy these to your Render service environment variables

# Backend Service Environment Variables
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
CORS_ORIGIN=https://your-frontend-app.onrender.com
UPLOAD_PATH=/app/uploads

# Frontend Service Environment Variables
VITE_API_URL=https://your-backend-app.onrender.com

# Optional: Redis URL (if using Redis service)
REDIS_URL=redis://username:password@host:port
EOF

echo "✅ Render deployment files created successfully!"
echo ""
echo "📋 Next Steps for Render Deployment:"
echo "===================================="
echo ""
echo "1. 🔗 Connect Repository:"
echo "   - Go to https://render.com/"
echo "   - Connect your GitHub/GitLab repository"
echo ""
echo "2. 🗄️ Create PostgreSQL Database:"
echo "   - Create a new PostgreSQL service"
echo "   - Note the connection string"
echo ""
echo "3. 🖥️ Deploy Backend Service:"
echo "   - Create a new Web Service"
echo "   - Set Docker build context to root directory"
echo "   - Set Dockerfile path: infra/Dockerfile.backend"
echo "   - Add environment variables from .env.render.example"
echo "   - Set build command: ./scripts/render-build-backend.sh"
echo ""
echo "4. 🌐 Deploy Frontend Service:"
echo "   - Create another Web Service"
echo "   - Set Docker build context to root directory"
echo "   - Set Dockerfile path: infra/Dockerfile.frontend"
echo "   - Set VITE_API_URL to your backend service URL"
echo "   - Set build command: ./scripts/render-build-frontend.sh"
echo ""
echo "5. 🔧 Optional - Deploy Redis:"
echo "   - Create a Redis service for caching"
echo "   - Update backend environment with Redis URL"
echo ""
echo "6. 🚀 Deploy:"
echo "   - Render will automatically deploy on git push"
echo "   - Monitor deployment logs"
echo "   - Test your application"
echo ""
echo "💡 Tips:"
echo "- Use Render's free tier for testing"
echo "- Set up custom domains in Render dashboard"
echo "- Enable auto-deploy for continuous deployment"
echo "- Monitor application logs in Render dashboard"
echo ""
echo "🎉 Render deployment preparation completed!"