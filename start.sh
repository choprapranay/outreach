#!/bin/bash

# Outreach - One-Command Startup Script
echo "🚀 Starting Outreach..."
echo ""

# Check if .env file exists in root
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📝 Please copy env.example to .env and fill in your API keys:"
    echo "   cp env.example .env"
    echo "   Then edit .env with your API keys"
    exit 1
fi

# Load environment variables from root .env
export $(grep -v '^#' .env | xargs)

# Create individual .env files from root .env
echo "📝 Setting up environment files..."

# Backend .env
cat > backend/.env << EOF
GDC_API_KEY=${GDC_API_KEY}
EOF

# Backend-B .env
cat > backend-b/.env << EOF
BOSON_API_KEY=${BOSON_API_KEY}
EOF

# Call .env
cat > call/.env << EOF
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
WEBHOOK_BASE_URL=${WEBHOOK_BASE_URL}
EOF

# Frontend .env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
EOF

# Check if first time setup is needed
FIRST_TIME=false

# Check if node_modules exists in frontend
if [ ! -d "frontend/node_modules" ]; then
    FIRST_TIME=true
fi

# Check if venv exists in backend
if [ ! -d "backend/venv" ]; then
    FIRST_TIME=true
fi

if [ "$FIRST_TIME" = true ]; then
    echo "📦 First time setup detected. Installing dependencies..."
    echo ""
    
    # Frontend
    if [ ! -d "frontend/node_modules" ]; then
        echo "📱 Installing frontend dependencies..."
        cd frontend && npm install
        cd ..
    fi
    
    # Backend
    if [ ! -d "backend/venv" ]; then
        echo "🗺️  Setting up backend..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r ../requirements.txt
        deactivate
        cd ..
    fi
    
    # Backend-B
    if [ ! -d "backend-b/venv" ]; then
        echo "🤖 Setting up backend-b (AI)..."
        cd backend-b
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        deactivate
        cd ..
    fi
    
    # Call Service
    if [ ! -d "call/venv" ]; then
        echo "📞 Setting up call service..."
        cd call
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        deactivate
        cd ..
    fi
    
    echo ""
    echo "✅ Dependencies installed!"
    echo ""
fi

# Check if ngrok is running and get URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*ngrok[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "⚠️  Starting ngrok..."
    ngrok http 8002 > /dev/null 2>&1 &
    sleep 3
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*ngrok[^"]*' | head -1)
    
    if [ -z "$NGROK_URL" ]; then
        echo "❌ Failed to start ngrok. Please install it: https://ngrok.com/download"
        echo "   Or run: brew install ngrok"
        exit 1
    fi
fi

# Update webhook URL in call/.env
echo "📝 Updating webhook URL: $NGROK_URL"
sed -i.bak "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=$NGROK_URL|g" call/.env 2>/dev/null || \
    sed -i '' "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=$NGROK_URL|g" call/.env

echo ""
echo "✅ Starting all services..."
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Kill any existing processes on our ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8002 | xargs kill -9 2>/dev/null

# Start Backend (Places API) - Port 8001
echo "🗺️  Starting Backend (Places API) on port 8001..."
cd backend && source venv/bin/activate && python app.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start Backend-B (AI/TTS) - Port 8000
echo "🤖 Starting Backend-B (AI/TTS) on port 8000..."
cd backend-b && source venv/bin/activate && python app.py > ../logs/backend-b.log 2>&1 &
BACKEND_B_PID=$!
cd ..

# Start Call Service (Twilio) - Port 8002
echo "📞 Starting Call Service (Twilio) on port 8002..."
cd call && source venv/bin/activate && python app.py > ../logs/call.log 2>&1 &
CALL_PID=$!
cd ..

# Start Frontend - Port 3000
echo "🎨 Starting Frontend on port 3000..."
cd frontend && npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Outreach is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend:        http://localhost:3000"
echo "🗺️  Backend API:     http://localhost:8001"
echo "🤖 AI Service:      http://localhost:8000"
echo "📞 Call Service:    http://localhost:8002"
echo "🔗 Ngrok Webhook:   $NGROK_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Process IDs:"
echo "   Backend:    $BACKEND_PID"
echo "   Backend-B:  $BACKEND_B_PID"
echo "   Call:       $CALL_PID"
echo "   Frontend:   $FRONTEND_PID"
echo ""
echo "📝 Logs are in: logs/"
echo ""
echo "To stop all services, run: ./stop.sh"
echo "Or press Ctrl+C and run: ./stop.sh"
echo ""

# Save PIDs to file for stop script
echo "$BACKEND_PID" > .pids
echo "$BACKEND_B_PID" >> .pids
echo "$CALL_PID" >> .pids
echo "$FRONTEND_PID" >> .pids

# Keep script running
wait
