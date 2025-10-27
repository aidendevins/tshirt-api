#!/bin/bash

# T-Shirt API Local Server Startup Script
echo "🎨 Starting T-Shirt Design Generator API Server..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your API keys before running again."
    echo "   Required: GEMINI_API_KEY"
    echo "   Optional: REPLICATE_API_TOKEN"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for required environment variables
if ! grep -q "GEMINI_API_KEY=your_gemini_api_key_here" .env; then
    echo "✅ Environment variables configured"
else
    echo "❌ Please configure your API keys in .env file"
    echo "   Edit .env and replace 'your_gemini_api_key_here' with your actual Gemini API key"
    exit 1
fi

echo "🚀 Starting server..."
echo "📱 Frontend will be available at: http://localhost:3000"
echo "🔗 API endpoints:"
echo "   - POST http://localhost:3000/api/generate-sd"
echo "   - POST http://localhost:3000/api/generate"
echo "   - GET  http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
