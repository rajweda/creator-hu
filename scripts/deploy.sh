#!/bin/bash

# Creator Hub - Universal Deployment Script
# This script provides options for deploying to different platforms

set -e

echo "🚀 Creator Hub - Universal Deployment Script"
echo "============================================"
echo ""
echo "This script will help you deploy your Creator Hub application"
echo "to your preferred hosting platform."
echo ""

# Function to display menu
show_menu() {
    echo "📋 Available Deployment Options:"
    echo "================================"
    echo "1. 🐳 Docker (Local/Self-hosted)"
    echo "2. 🚂 Railway (Full-stack hosting)"
    echo "3. 🎨 Render (Full-stack hosting)"
    echo "4. ▲ Vercel (Frontend only)"
    echo "5. 🌐 Manual Setup Guide"
    echo "6. ❌ Exit"
    echo ""
}

# Function for Docker deployment
deploy_docker() {
    echo "🐳 Docker Deployment Selected"
    echo "============================="
    echo ""
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first:"
        echo "   https://docs.docker.com/get-docker/"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
        echo "   https://docs.docker.com/compose/install/"
        return 1
    fi
    
    echo "✅ Docker and Docker Compose found"
    
    # Create .env file for Docker
    if [[ ! -f "infra/.env" ]]; then
        echo "📝 Creating environment file..."
        cat > infra/.env << 'EOF'
# Database Configuration
DB_PASSWORD=postgres123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-chars

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# API Configuration
VITE_API_URL=http://localhost:5000
EOF
        echo "⚠️ Please update the JWT_SECRET in infra/.env with a secure secret!"
    fi
    
    echo "🏗️ Building and starting services..."
    cd infra
    docker-compose up --build -d
    
    echo "✅ Services started successfully!"
    echo ""
    echo "🔗 Your application is now running at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:5000"
    echo "   Database: localhost:5432"
    echo "   Redis:    localhost:6379"
    echo ""
    echo "📊 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
    
    cd ..
}

# Function for Railway deployment
deploy_railway() {
    echo "🚂 Railway Deployment Selected"
    echo "=============================="
    echo ""
    
    if [[ -f "scripts/deploy-railway.sh" ]]; then
        chmod +x scripts/deploy-railway.sh
        ./scripts/deploy-railway.sh
    else
        echo "❌ Railway deployment script not found!"
        return 1
    fi
}

# Function for Render deployment
deploy_render() {
    echo "🎨 Render Deployment Selected"
    echo "============================="
    echo ""
    
    if [[ -f "scripts/deploy-render.sh" ]]; then
        chmod +x scripts/deploy-render.sh
        ./scripts/deploy-render.sh
    else
        echo "❌ Render deployment script not found!"
        return 1
    fi
}

# Function for Vercel deployment
deploy_vercel() {
    echo "▲ Vercel Deployment Selected"
    echo "============================="
    echo ""
    echo "⚠️ Note: Vercel is for frontend only. You'll need a separate backend hosting."
    echo "   Recommended backend options: Railway, Render, or Heroku"
    echo ""
    read -p "Continue with Vercel frontend deployment? (y/n): " continue_vercel
    
    if [[ $continue_vercel == "y" || $continue_vercel == "Y" ]]; then
        if [[ -f "scripts/deploy-vercel.sh" ]]; then
            chmod +x scripts/deploy-vercel.sh
            ./scripts/deploy-vercel.sh
        else
            echo "❌ Vercel deployment script not found!"
            return 1
        fi
    else
        echo "Vercel deployment cancelled."
    fi
}

# Function for manual setup guide
show_manual_guide() {
    echo "🌐 Manual Setup Guide"
    echo "====================="
    echo ""
    echo "📋 Pre-deployment Checklist:"
    echo "1. ✅ Ensure all TypeScript errors are fixed"
    echo "2. ✅ Test the application locally"
    echo "3. ✅ Set up environment variables"
    echo "4. ✅ Configure database connection"
    echo "5. ✅ Set up file upload storage"
    echo ""
    echo "🔧 Environment Variables Needed:"
    echo "Backend:"
    echo "- NODE_ENV=production"
    echo "- PORT=5000"
    echo "- DATABASE_URL=postgresql://..."
    echo "- JWT_SECRET=your-secret-key"
    echo "- CORS_ORIGIN=https://your-frontend-domain.com"
    echo ""
    echo "Frontend:"
    echo "- VITE_API_URL=https://your-backend-domain.com"
    echo ""
    echo "📚 Platform-specific guides:"
    echo "- Heroku: https://devcenter.heroku.com/articles/deploying-nodejs"
    echo "- AWS: https://docs.aws.amazon.com/elasticbeanstalk/"
    echo "- Google Cloud: https://cloud.google.com/run/docs/quickstarts"
    echo "- DigitalOcean: https://docs.digitalocean.com/products/app-platform/"
    echo ""
}

# Main script logic
while true; do
    show_menu
    read -p "Please select an option (1-6): " choice
    echo ""
    
    case $choice in
        1)
            deploy_docker
            break
            ;;
        2)
            deploy_railway
            break
            ;;
        3)
            deploy_render
            break
            ;;
        4)
            deploy_vercel
            break
            ;;
        5)
            show_manual_guide
            echo ""
            read -p "Press Enter to return to menu..."
            echo ""
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option. Please select 1-6."
            echo ""
            ;;
    esac
done

echo ""
echo "🎉 Deployment process completed!"
echo "📚 For more help, check the deployment documentation."
echo "🐛 If you encounter issues, please check the logs and troubleshooting guide."