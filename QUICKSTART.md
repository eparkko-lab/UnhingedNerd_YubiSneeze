# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- A spare YubiKey (optional for testing)
- `ykman` CLI (optional for real YubiKey)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Generate Phrases

```bash
npm run generate-phrases
```

This creates `phrases.json` with credentials for each modhex phrase.

Example output:
```
✅ Generated credentials for: unhingednerd
✅ Generated credentials for: defcbdefcbde
✅ Generated credentials for: findthecredi
```

### Step 3: Start Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

### Step 4: Test It Works

**Option A: Automated Test (No YubiKey Required)**

```bash
node test-validation.js
```

This simulates the entire OTP flow and validates it works.

**Option B: Full Test Suite**

```bash
node test-scenarios.js
```

Runs comprehensive tests including replay detection.

**Option C: Manual API Test**

```bash
# Check health
curl http://localhost:3000/health

# List phrases
curl http://localhost:3000/phrases

# Get credentials for testing
curl http://localhost:3000/credentials/unhingednerd
```

### Step 5: Test with Real YubiKey (Optional)

**Get credentials:**
```bash
curl http://localhost:3000/credentials/unhingednerd
```

**Program your YubiKey:**
```bash
# Copy the command from the credentials response
ykman otp yubiotp --public-id unhingednerd --private-id <ID> --key <KEY> 1
```

**Press YubiKey button** to generate OTP

**Submit claim:**
```bash
curl -X POST http://localhost:3000/claim \
  -H "Content-Type: application/json" \
  -d '{"otp": "YOUR-44-CHAR-OTP-HERE", "playerName": "YourName"}'
```

**Expected success response:**
```json
{
  "success": true,
  "phrase": "unhingednerd",
  "claimedBy": "YourName",
  "message": "Phrase claimed successfully!"
}
```

### Step 6: Check Leaderboard

```bash
curl http://localhost:3000/phrases
```

## 📁 Project Structure

```
unhingednerd/
├── src/
│   ├── server.js              # Local HTTP server
│   ├── lambda.js              # AWS Lambda handler
│   ├── yubikey-validator.js   # OTP validation logic
│   ├── game-state.js          # Game state management
│   └── generate-phrases.js    # Phrase generator
├── deployment/
│   ├── lambda-deploy.sh       # Deploy to AWS
│   └── dynamodb-setup.sh      # Setup DynamoDB
├── test-validation.js         # Single OTP test
├── test-scenarios.js          # Full test suite
├── phrases.json               # Generated credentials (gitignored)
└── package.json               # Node.js config
```

## 🎮 How to Play (Overview)

1. **Find phrase** in word search grid → `unhingednerd`
2. **Get credentials** from game UI
3. **Program YubiKey** with `ykman`
4. **Press button** to generate OTP
5. **Submit claim** to server
6. **First valid wins!** 🏆

## 🔧 Development

**Run tests on file change:**
```bash
# Install nodemon globally
npm install -g nodemon

# Auto-run tests
nodemon --exec "node test-scenarios.js" --watch src
```

**Debug server:**
```bash
# Enable debug logging
DEBUG=* npm run dev
```

**Generate new phrases:**
Edit `src/generate-phrases.js` to add more phrases:
```javascript
const phrases = [
  'unhingednerd',
  'defcbdefcbde',
  'findthecredi',
  'yournewphrase'  // Must be 12 chars, all modhex!
];
```

Then run:
```bash
npm run generate-phrases
```

## 🌐 Deploy to AWS

**One-command deploy:**
```bash
cd deployment
./lambda-deploy.sh
```

This will:
- Create Lambda function
- Set up IAM role
- Create function URL
- Configure CORS

**Setup DynamoDB (for production):**
```bash
./dynamodb-setup.sh
```

## 📚 Documentation

- `README.md` - Project overview
- `ARCHITECTURE.md` - System design diagrams
- `DEMO.md` - Demo guide for events
- `YUBIKEY-SETUP.md` - Player setup instructions
- `STATUS.md` - Current project status

## 🐛 Troubleshooting

**Server won't start (port in use):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

**Tests failing:**
Make sure server is running first:
```bash
npm run dev
# In another terminal:
node test-scenarios.js
```

**YubiKey not detected:**
```bash
# Check YubiKey is plugged in
ykman list

# Check version
ykman --version
```

## ✅ Verification Checklist

Before running a live event:

- [ ] Server starts without errors
- [ ] All tests pass (`test-scenarios.js`)
- [ ] Phrases generated in `phrases.json`
- [ ] Can program test YubiKey
- [ ] Can submit and validate OTP
- [ ] Leaderboard shows correct data
- [ ] Replay attacks are blocked
- [ ] Concurrent claims handled correctly

## 🎯 Next Steps

1. **Build word search frontend** - HTML/JS grid with highlighting
2. **Deploy to AWS** - Lambda + API Gateway
3. **Add DynamoDB** - Persistent state
4. **Create admin panel** - Game management

## 💡 Tips

- Use modhex-only words for phrases: `cbdefghijklnrtuv`
- Keep private keys SECRET in production
- Test with spare YubiKeys only
- Each YubiKey can store 2 OTP configs (slot 1 and 2)
- Replay protection requires stateful tracking (counter/timestamp)

## 🎉 You're Ready!

Your validation server is working. Next: build the word search UI and connect it to this backend.

For questions or issues, check the documentation files or run the test suite to verify everything works.
