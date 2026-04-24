#!/bin/bash

echo "============================================"
echo "   AI Dream Journal Analyzer - Startup"
echo "============================================"

# Load environment variables
set -a
source .env 2>/dev/null
set +a

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo ""
echo "[1/6] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
sleep 1
echo "  Ports cleaned."

# Check PostgreSQL
echo ""
echo "[2/6] Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "  ERROR: PostgreSQL is not installed. Please install it first."
    echo "  On macOS: brew install postgresql@16 && brew services start postgresql@16"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo "  Starting PostgreSQL..."
    brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null
    sleep 2
fi

# Create database and user
echo ""
echo "[3/6] Setting up database..."
psql postgres -c "CREATE USER dreamuser WITH PASSWORD 'dreampass';" 2>/dev/null
psql postgres -c "ALTER USER dreamuser CREATEDB;" 2>/dev/null
psql postgres -c "DROP DATABASE IF EXISTS dreamjournal;" 2>/dev/null
psql postgres -c "CREATE DATABASE dreamjournal OWNER dreamuser;" 2>/dev/null
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE dreamjournal TO dreamuser;" 2>/dev/null
echo "  Database ready."

# Install dependencies
echo ""
echo "[4/6] Installing dependencies..."
cd backend && npm install --silent 2>&1 | tail -1
cd ../frontend && npm install --silent 2>&1 | tail -1
cd ..
echo "  Dependencies installed."

# Seed database
echo ""
echo "[5/6] Seeding database..."
cd backend && node seed.js
cd ..

# Start servers with hot reload
echo ""
echo "[6/6] Starting servers..."
echo ""
echo "  Backend:  http://localhost:$BACKEND_PORT (nodemon - hot reload)"
echo "  Frontend: http://localhost:$FRONTEND_PORT (vite - hot reload)"
echo ""
echo "  Login credentials:"
echo "  Email:    demo@dreamjournal.com"
echo "  Password: demo1234"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "============================================"

# Start backend with nodemon (hot reload)
cd backend && npx nodemon server.js &
BACKEND_PID=$!

# Start frontend with vite (hot reload)
cd frontend && npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

# Handle shutdown
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
    echo "All servers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
