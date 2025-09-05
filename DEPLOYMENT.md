# Creator Hub - Deployment Guide

This guide provides comprehensive instructions for deploying the Creator Hub application to various hosting platforms.

## 📋 Table of Contents

- [Pre-deployment Checklist](#-pre-deployment-checklist)
- [Quick Start](#-quick-start)
- [Docker Deployment](#-docker-deployment)
- [Railway Deployment](#-railway-deployment)
- [Render Deployment](#-render-deployment)
- [Vercel Deployment](#-vercel-deployment)
- [Manual Deployment](#-manual-deployment)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Monitoring & Health Checks](#-monitoring--health-checks)
- [Troubleshooting](#-troubleshooting)
- [Security Considerations](#-security-considerations)

## ✅ Pre-deployment Checklist

Before deploying, ensure you have:

- [ ] All TypeScript errors resolved
- [ ] Application tested locally
- [ ] Environment variables configured
- [ ] Database schema ready
- [ ] File upload storage configured
- [ ] Domain names ready (if using custom domains)
- [ ] SSL certificates (handled by most platforms automatically)

## 🚀 Quick Start

For the fastest deployment, use our universal deployment script:

```bash
# Make the script executable
chmod +x scripts/deploy.sh

# Run the deployment script
./scripts/deploy.sh
```

This script will guide you through choosing and configuring your preferred deployment platform.

## 🐳 Docker Deployment

### Local Docker Deployment

Perfect for development, testing, or self-hosted production environments.

#### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 3000, 5000, 5432, and 6379 available

#### Steps

1. **Clone and navigate to the project:**
   ```bash
   git clone <your-repo-url>
   cd creator-hub
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.production.example infra/.env
   # Edit infra/.env with your configuration
   ```

3. **Build and start services:**
   ```bash
   cd infra
   docker-compose up --build -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

5. **Access your application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

#### Docker Commands Reference

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Access backend container
docker-compose exec backend bash

# Access database
docker-compose exec postgres psql -U postgres -d creator_hub
```

## 🚂 Railway Deployment

Railway provides excellent full-stack hosting with automatic scaling and built-in databases.

### Prerequisites
- Railway account (https://railway.app)
- Railway CLI installed: `npm install -g @railway/cli`
- GitHub repository with your code

### Automated Deployment

```bash
# Run the Railway deployment script
chmod +x scripts/deploy-railway.sh
./scripts/deploy-railway.sh
```

### Manual Railway Deployment

1. **Create Railway Project:**
   ```bash
   railway login
   railway init
   ```

2. **Add PostgreSQL Database:**
   - Go to Railway dashboard
   - Add PostgreSQL service
   - Note the connection string

3. **Deploy Backend Service:**
   - Create new service
   - Connect GitHub repository
   - Set build context: root directory
   - Set Dockerfile path: `infra/Dockerfile.backend`
   - Add environment variables (see [Environment Variables](#-environment-variables))

4. **Deploy Frontend Service:**
   - Create another service
   - Connect same GitHub repository
   - Set Dockerfile path: `infra/Dockerfile.frontend`
   - Set `VITE_API_URL` to backend service URL

5. **Run Database Migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

### Railway Environment Variables

```bash
# Backend Service
NODE_ENV=production
PORT=5000
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGIN=https://your-frontend.railway.app

# Frontend Service
VITE_API_URL=https://your-backend.railway.app
```

## 🎨 Render Deployment

Render offers great performance and simplicity for full-stack applications.

### Prerequisites
- Render account (https://render.com)
- GitHub repository with your code

### Automated Deployment

```bash
# Run the Render deployment script
chmod +x scripts/deploy-render.sh
./scripts/deploy-render.sh
```

### Manual Render Deployment

1. **Create PostgreSQL Database:**
   - Go to Render dashboard
   - Create new PostgreSQL service
   - Note the connection details

2. **Deploy Backend Service:**
   - Create new Web Service
   - Connect GitHub repository
   - Set build context: root directory
   - Set Dockerfile path: `infra/Dockerfile.backend`
   - Add environment variables
   - Set health check path: `/health`

3. **Deploy Frontend Service:**
   - Create another Web Service
   - Connect GitHub repository
   - Set Dockerfile path: `infra/Dockerfile.frontend`
   - Set `VITE_API_URL` environment variable
   - Set health check path: `/health`

4. **Configure Auto-Deploy:**
   - Enable auto-deploy on git push
   - Set up branch-based deployments if needed

## ▲ Vercel Deployment

Vercel is excellent for frontend deployment with global CDN and automatic scaling.

> **Note:** Vercel is frontend-only. You'll need separate backend hosting (Railway, Render, etc.)

### Prerequisites
- Vercel account (https://vercel.com)
- Vercel CLI: `npm install -g vercel`
- Backend deployed elsewhere

### Automated Deployment

```bash
# Run the Vercel deployment script
chmod +x scripts/deploy-vercel.sh
./scripts/deploy-vercel.sh
```

### Manual Vercel Deployment

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Login and deploy:**
   ```bash
   vercel login
   vercel --prod
   ```

3. **Set environment variables:**
   ```bash
   vercel env add VITE_API_URL production
   # Enter your backend API URL when prompted
   ```

4. **Configure custom domain (optional):**
   ```bash
   vercel domains add yourdomain.com
   ```

## 🔧 Manual Deployment

For custom hosting solutions or specific requirements.

### Server Requirements
- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for caching)
- Nginx (recommended for production)
- SSL certificate
- At least 1GB RAM, 10GB storage

### Backend Deployment Steps

1. **Prepare the server:**
   ```bash
   # Install Node.js, PostgreSQL, and Nginx
   sudo apt update
   sudo apt install nodejs npm postgresql nginx
   ```

2. **Clone and build:**
   ```bash
   git clone <your-repo-url>
   cd creator-hub/backend
   npm ci --production
   npx prisma generate
   npm run build
   ```

3. **Set up database:**
   ```bash
   sudo -u postgres createdb creator_hub
   npx prisma migrate deploy
   ```

4. **Configure environment:**
   ```bash
   cp ../.env.production.example .env
   # Edit .env with your configuration
   ```

5. **Set up process manager:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name creator-hub-backend
   pm2 startup
   pm2 save
   ```

### Frontend Deployment Steps

1. **Build frontend:**
   ```bash
   cd ../frontend
   npm ci
   npm run build
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/creator-hub/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable and start Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

## 🔐 Environment Variables

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|----------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Server port | Yes | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes | `your-super-secret-key` |
| `CORS_ORIGIN` | Allowed frontend origins | Yes | `https://yourapp.com` |
| `UPLOAD_PATH` | File upload directory | No | `/app/uploads` |
| `REDIS_URL` | Redis connection string | No | `redis://localhost:6379` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|----------|
| `VITE_API_URL` | Backend API URL | Yes | `https://api.yourapp.com` |
| `VITE_APP_NAME` | Application name | No | `Creator Hub` |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics ID | No | `G-XXXXXXXXXX` |

## 🗄️ Database Setup

### PostgreSQL Configuration

1. **Create database:**
   ```sql
   CREATE DATABASE creator_hub;
   CREATE USER creator_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE creator_hub TO creator_user;
   ```

2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed database (optional):**
   ```bash
   npx prisma db seed
   ```

### Database Backup

```bash
# Create backup
pg_dump -h hostname -U username -d creator_hub > backup.sql

# Restore backup
psql -h hostname -U username -d creator_hub < backup.sql
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

- **Basic Health:** `GET /health`
- **Readiness Probe:** `GET /health/ready`
- **Liveness Probe:** `GET /health/live`

### Monitoring Setup

1. **Application Monitoring:**
   - Use health check endpoints
   - Monitor response times
   - Track error rates

2. **Database Monitoring:**
   - Monitor connection pool
   - Track query performance
   - Set up alerts for downtime

3. **Infrastructure Monitoring:**
   - CPU and memory usage
   - Disk space
   - Network performance

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database connectivity
npx prisma db pull

# Verify connection string format
echo $DATABASE_URL
```

#### Build Failures
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

#### CORS Issues
```bash
# Verify CORS_ORIGIN environment variable
echo $CORS_ORIGIN

# Check frontend URL matches CORS settings
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Verify UPLOAD_PATH environment variable
echo $UPLOAD_PATH
```

### Debugging Commands

```bash
# View application logs
docker-compose logs -f backend

# Check health status
curl http://localhost:5000/health

# Test database connection
npx prisma db pull

# Verify environment variables
env | grep -E '(NODE_ENV|DATABASE_URL|JWT_SECRET)'
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use strong, unique JWT secrets (32+ characters)
- [ ] Enable HTTPS (handled by most platforms)
- [ ] Set secure CORS origins
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up proper database permissions
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities

### Security Headers

The application includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Database Security

- Use connection pooling
- Enable SSL for database connections
- Regular backups
- Principle of least privilege for database users

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🆘 Support

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review application logs
3. Verify environment variables
4. Test health check endpoints
5. Check platform-specific documentation

---

**Happy Deploying! 🚀**

For updates and improvements to this deployment guide, please check the repository regularly.