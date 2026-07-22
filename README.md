# UnhingedNerd - YubiKey Word Search Game

A competitive word search game where players find modhex phrases and claim them by programming their YubiKey and submitting a valid OTP.

## Game Concept

1. Players scan a word search grid for 12-character modhex phrases
2. When found, the phrase reveals YubiKey programming credentials
3. Players program a spare YubiKey with those credentials
4. Press the YubiKey button to generate an OTP
5. Submit the OTP to claim the phrase
6. First valid submission wins!

## ⚠️ WARNING

**This game requires programming a YubiKey, which is PERMANENT.**
- Only use spare YubiKeys
- Never use keys configured for actual authentication
- Perfect for hackathon events with developers who have spare hardware

## License

MIT License - see [LICENSE](LICENSE) file for details.

Feel free to fork, modify, and use for your own events! If you run this at your hackathon, we'd love to hear about it (but no obligation).

## Credits

Created for YubiKey hackathon events by UnhingedNerd.

The game concept combines:
- Word search puzzles with modhex constraints
- YubiKey OTP programming
- Competitive speed racing
- Educational security concepts

## Attribution (Optional but Appreciated)

While not required by the MIT license, if you create your own version or run this at your event, a shout-out would be awesome! Tag @unhingednerd or link back to this repo.

## Setup

### Local Development

```bash
# Install dependencies
npm install

# Generate initial phrases and credentials
npm run generate-phrases

# Start local server
npm run dev
```

The server runs on `http://localhost:3000`

### Testing the Flow

1. **Generate phrases:**
   ```bash
   npm run generate-phrases
   ```
   This creates `phrases.json` with credentials for each phrase.

2. **Get credentials for a phrase:**
   ```bash
   curl http://localhost:3000/credentials/unhingednerd
   ```

3. **Program your YubiKey** (requires spare YubiKey and `ykman` CLI):
   ```bash
   # Example from phrases.json output
   ykman otp yubiotp --public-id unhingednerd --private-id <privateId> --key <aesKey> 1
   ```

4. **Generate OTP** by pressing your YubiKey button

5. **Submit claim:**
   ```bash
   curl -X POST http://localhost:3000/claim \
     -H "Content-Type: application/json" \
     -d '{"otp": "unhingednerd<32-char-encrypted-token>", "playerName": "YourName"}'
   ```

6. **Check leaderboard:**
   ```bash
   curl http://localhost:3000/phrases
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /phrases` - List all phrases and claim status
- `POST /claim` - Claim a phrase with OTP and grid coordinates
  - Body: `{"otp": "44-char-modhex-otp", "playerName": "string", "startRow": number, "startCol": number, "endRow": number, "endCol": number}`
  - **Anti-cheat:** Requires exact grid position where phrase was found
- `GET /credentials/:phrase` - Get programming credentials (testing only)

## Anti-Cheat System

The server validates that players actually found the phrase in the word search grid by requiring the exact coordinates of the first and last character.

- **What's protected:** Grid positions stored server-side only
- **What's public:** Grid without positions served to frontend
- **What's required:** Players must submit coordinates with their claim

See [ANTI-CHEAT.md](./ANTI-CHEAT.md) for full details.

## Architecture

### Local/Testing
- In-memory game state
- Node.js HTTP server
- File-based credential storage

### Production (AWS Lambda)
- DynamoDB for game state persistence
- API Gateway for HTTP routing
- Lambda function for validation logic
- Secrets Manager for credential storage

## Modhex Alphabet

YubiKey uses modhex encoding: `cbdefghijklnrtuv` (16 characters)

This means only phrases using these letters can be hidden in the word search!

Examples:
- ✅ `unhingednerd` (all modhex chars)
- ✅ `defcbdefcbde`
- ❌ `hello` (contains 'o', 'a')

## How OTP Validation Works

1. Extract public ID from first 12 chars of OTP
2. Look up credentials for that phrase
3. Decrypt the encrypted token (last 32 chars) using AES key
4. Verify CRC checksum
5. Verify private ID matches
6. Check for replay attacks (counter/timestamp)
7. Mark phrase as claimed if valid

## Next Steps

- [ ] Build word search grid generator
- [ ] Build frontend UI with highlight detection
- [ ] Deploy to AWS Lambda + DynamoDB
- [ ] Add leaderboard visualization
- [ ] Create admin panel for game management
