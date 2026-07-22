# AWS Lightsail Deployment Guide

## Cost: $3.50/month (you can delete it after the event!)

## Step 1: Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click **Create instance**
3. **Instance location:** Choose closest to your players
4. **Platform:** Linux/Unix
5. **Blueprint:** OS Only → **Ubuntu 22.04 LTS**
6. **Instance plan:** $3.50/month (512 MB RAM, 1 vCPU)
7. **Name:** `yubisneeze-game`
8. Click **Create instance**

Wait 1-2 minutes for it to start.

## Step 2: Open Firewall Port

1. Click on your instance name
2. Go to **Networking** tab
3. Scroll to **Firewall**
4. Click **Add rule**
   - **Application:** Custom
   - **Protocol:** TCP
   - **Port:** 3000
   - Click **Create**

## Step 3: Get Your Instance IP

On the instance page, note the **Public IP** (e.g., `54.123.45.67`)

You'll share this with players: `http://54.123.45.67:3000`

## Step 4: SSH Into Instance

### Option A: Browser SSH (Easiest)
1. Click on your instance
2. Click **Connect using SSH** button
3. Terminal opens in browser!

### Option B: SSH Client
```bash
# Download SSH key from Lightsail console
ssh -i LightsailDefaultKey.pem ubuntu@54.123.45.67
```

## Step 5: Deploy the Game

Once SSH'd in, run these commands:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clone your game (or upload files)
# Option A: If you have it on GitHub:
git clone https://github.com/your-username/unhingednerd.git
cd unhingednerd

# Option B: Manual upload (see below)

# Install dependencies
npm install

# Generate game
npm run generate-game

# Start server (runs in background)
nohup npm run dev > server.log 2>&1 &

# Verify it's running
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

## Step 6: Access the Game

Open in your browser:
```
http://YOUR-LIGHTSAIL-IP:3000
```

Share this URL with your friends!

## Uploading Files Without Git

If you don't want to use GitHub:

### On Your Computer:
```bash
# Zip your project
cd C:\Work\claude\unhingednerd
tar -czf yubisneeze.tar.gz --exclude=node_modules .

# Upload using SCP
scp -i LightsailDefaultKey.pem yubisneeze.tar.gz ubuntu@YOUR-IP:~
```

### On Lightsail:
```bash
# Extract and run
tar -xzf yubisneeze.tar.gz
npm install
npm run generate-game
nohup npm run dev > server.log 2>&1 &
```

## Managing the Server

### View Logs
```bash
tail -f server.log
```

### Stop Server
```bash
# Find process
ps aux | grep node

# Kill it
pkill -f "node src/server.js"
```

### Restart Server
```bash
pkill -f "node src/server.js"
nohup npm run dev > server.log 2>&1 &
```

### Reset Game (New Grid)
```bash
npm run generate-game
# Server auto-resets!
```

### Check Server Status
```bash
curl http://localhost:3000/phrases
```

## During the Event

### Monitor Activity
```bash
# Watch logs in real-time
tail -f server.log

# Check who's connected
netstat -an | grep :3000
```

### If Server Crashes
```bash
# Restart it
cd ~/unhingednerd
nohup npm run dev > server.log 2>&1 &
```

## After the Event: Clean Up

1. Go to Lightsail Console
2. Click on instance
3. Click **Delete**
4. Confirm deletion

**You'll only be charged for the days it was running!**

Pro-rated: $3.50/month = ~$0.12/day

## Troubleshooting

### Can't Access from Browser
- Check firewall rule is created (port 3000)
- Verify server is running: `ps aux | grep node`
- Check logs: `tail -f server.log`

### Port Already in Use
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>
```

### Server Won't Start
```bash
# Check for errors
cat server.log

# Try running in foreground to see errors
npm run dev
```

### Out of Memory
```bash
# Check memory
free -h

# Upgrade to $5/month plan (1GB RAM) if needed
```

## Quick Setup Script

I've created `lightsail-setup.sh` - upload it and run:

```bash
chmod +x lightsail-setup.sh
./lightsail-setup.sh
```

This automates the entire setup!

## Advanced: Custom Domain (Optional)

If you want `yubisneeze.yourdomain.com` instead of IP:

1. In Lightsail, create **Static IP**
2. Attach to your instance
3. In your DNS provider, add A record:
   - Name: `yubisneeze`
   - Value: `your-static-ip`
4. Access via: `http://yubisneeze.yourdomain.com:3000`

## Summary

**Total time:** 10 minutes  
**Total cost:** ~$0.40 for a day  
**Concurrent players:** 50+ easily  

Perfect for a hackathon day! 🎉
