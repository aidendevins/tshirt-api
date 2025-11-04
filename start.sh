#!/bin/bash

# T-Shirt API Local Server Startup Script
echo "🎨 Starting T-Shirt Design Generator..."

# Check if backend .env file exists
if [ ! -f backend/.env ]; then
    echo "❌ No backend/.env file found"
    echo "📝 Please create backend/.env file with your API keys"
    exit 1
fi

# Check if frontend .env file exists
if [ ! -f frontend/.env ]; then
    echo "❌ No frontend/.env file found"
    echo "📝 Please create frontend/.env file with your configuration"
    exit 1
fi

# Check if backend node_modules exists
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "🚀 Starting servers..."
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"
echo "🏥 Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend server in background
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server in background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Wait for both processes
wait
