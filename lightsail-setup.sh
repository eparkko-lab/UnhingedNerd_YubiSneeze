#!/bin/bash

echo "=================================================="
echo "  UnhingedNerd YubiSneeze - Lightsail Setup"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo ""
echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
echo -e "${GREEN}✓ npm installed: $(npm --version)${NC}"

echo ""
echo -e "${YELLOW}Step 2: Setting up project directory...${NC}"
mkdir -p ~/yubisneeze
cd ~/yubisneeze

# Check if files already exist
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ Project files already exist${NC}"
else
    echo -e "${YELLOW}Please upload your project files to ~/yubisneeze${NC}"
    echo ""
    echo "From your local machine, run:"
    echo "  scp -i LightsailDefaultKey.pem -r C:\\Work\\claude\\unhingednerd/* ubuntu@YOUR-IP:~/yubisneeze/"
    echo ""
    read -p "Press Enter when files are uploaded..."
fi

echo ""
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
npm install

echo ""
echo -e "${YELLOW}Step 4: Generating game...${NC}"
npm run generate-game

echo ""
echo -e "${YELLOW}Step 5: Starting server...${NC}"

# Stop any existing server
pkill -f "node src/server.js" 2>/dev/null

# Start server in background
nohup npm run dev > server.log 2>&1 &

# Wait for server to start
sleep 3

# Test server
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Server is running!${NC}"
    echo ""
    echo "=================================================="
    echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo "=================================================="
    echo ""
    echo "Your game is now live at:"
    echo ""

    # Try to get public IP
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
    if [ ! -z "$PUBLIC_IP" ]; then
        echo -e "${GREEN}  http://$PUBLIC_IP:3000${NC}"
    else
        echo "  http://YOUR-LIGHTSAIL-IP:3000"
    fi

    echo ""
    echo "Share this URL with your friends!"
    echo ""
    echo "Useful commands:"
    echo "  View logs:     tail -f ~/yubisneeze/server.log"
    echo "  Stop server:   pkill -f 'node src/server.js'"
    echo "  Restart:       cd ~/yubisneeze && nohup npm run dev > server.log 2>&1 &"
    echo "  Reset game:    cd ~/yubisneeze && npm run generate-game"
    echo ""
else
    echo -e "${YELLOW}⚠ Server started but health check failed${NC}"
    echo "Check logs with: tail -f ~/yubisneeze/server.log"
fi

echo "=================================================="
