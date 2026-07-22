#!/bin/bash

echo ""
echo "============================================"
echo "  RESETTING YUBIKEY WORD SEARCH GAME"
echo "============================================"
echo ""

echo "Step 1: Generating new game..."
npm run generate-game

echo ""
echo "Step 2: Finding and stopping server..."
PID=$(netstat -ano | grep :3000 | awk '{print $5}' | head -1)
if [ ! -z "$PID" ]; then
    echo "Killing PID $PID"
    taskkill //F //PID $PID 2>/dev/null || kill -9 $PID 2>/dev/null
    sleep 1
fi

echo ""
echo "Step 3: Starting server..."
npm run dev &

echo ""
echo "============================================"
echo "  GAME RESET COMPLETE!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Hard refresh your browser (Ctrl+Shift+R)"
echo "2. You should see a fresh game with no claims"
echo ""
