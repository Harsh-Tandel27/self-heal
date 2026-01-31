#!/bin/bash

# Kill any existing processes on ports 3000, 3001, 8000
echo "🧹 Cleaning up ports..."
lsof -ti:3000,3001,8000 | xargs kill -9 2>/dev/null || true

# Start Backend
echo "🚀 Starting Backend (Port 8000)..."
cd backend
source venv/bin/activate 2>/dev/null || true  # Try to activate venv if it exists
uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "💻 Starting Frontend (Port 3000)..."
cd frontend
npm run dev -- -p 3000 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Start Simulated Store
echo "🛒 Starting Simulated Store (Port 3001)..."
cd simulated-store
npm run dev -- -p 3001 > ../store.log 2>&1 &
STORE_PID=$!
cd ..

echo "✅ All services started!"
echo "   - Agent Dashboard: http://localhost:3000"
echo "   - Simulated Store: http://localhost:3001"
echo "   - Backend API:     http://localhost:8000"
echo ""
echo "📝 Logs are being written to backend.log, frontend.log, and store.log"
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C to kill all background processes
trap "kill $BACKEND_PID $FRONTEND_PID $STORE_PID; exit" INT

# Keep script running
wait
