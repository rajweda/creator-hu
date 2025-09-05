#!/bin/bash

# Vercel Deployment Script for Creator Hub Frontend
# This script helps deploy the Creator Hub frontend to Vercel

set -e

echo "▲ Creator Hub - Vercel Deployment Script"
echo "======================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing now..."
    npm install -g vercel
fi

echo "✅ Vercel CLI found"

# Navigate to frontend directory
cd frontend

# Create vercel.json configuration
echo "📝 Creating Vercel configuration..."
cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "creator-hub-frontend",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))",
      "dest": "/$1",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "env": {
    "VITE_API_URL": "@vite_api_url"
  },
  "build": {
    "env": {
      "VITE_API_URL": "@vite_api_url"
    }
  }
}
EOF

# Update package.json build script for Vercel
echo "🔧 Updating package.json for Vercel..."
if ! grep -q '"vercel-build"' package.json; then
    # Add vercel-build script if it doesn't exist
    npm pkg set scripts.vercel-build="npm run build"
fi

echo "✅ Vercel configuration created"

# Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
fi

echo "✅ Vercel authentication successful"

# Initialize Vercel project
echo "📦 Setting up Vercel project..."
read -p "Do you want to create a new Vercel project? (y/n): " create_new

if [[ $create_new == "y" || $create_new == "Y" ]]; then
    echo "Creating new Vercel project..."
    vercel --confirm
else
    echo "Linking to existing Vercel project..."
    vercel link
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
echo "Please provide your backend API URL:"
read -p "Backend API URL (e.g., https://your-backend.railway.app): " api_url

if [[ -n "$api_url" ]]; then
    vercel env add VITE_API_URL production <<< "$api_url"
    vercel env add VITE_API_URL preview <<< "$api_url"
    echo "✅ Environment variables set"
else
    echo "⚠️ No API URL provided. You can set it later in Vercel dashboard."
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "🔗 Next steps:"
echo "1. Check your deployment at the provided URL"
echo "2. Set up custom domain if needed: vercel domains add <domain>"
echo "3. Configure additional environment variables if needed"
echo "4. Set up preview deployments for branches"
echo ""
echo "💡 Useful Vercel commands:"
echo "- vercel --prod          # Deploy to production"
echo "- vercel                 # Deploy to preview"
echo "- vercel logs            # View deployment logs"
echo "- vercel env ls          # List environment variables"
echo "- vercel domains ls      # List domains"
echo ""
echo "🎉 Vercel deployment completed!"

# Go back to root directory
cd ..