#!/bin/bash

# Outreach - Stop All Services Script
echo "🛑 Stopping Outreach..."

# Kill by PIDs if available
if [ -f .pids ]; then
    while read pid; do
        kill -9 $pid 2>/dev/null
    done < .pids
    rm .pids
fi

# Kill by ports as backup
echo "🧹 Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8002 | xargs kill -9 2>/dev/null

echo "✅ All services stopped!"

