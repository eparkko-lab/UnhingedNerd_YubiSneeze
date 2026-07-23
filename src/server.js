import http from 'http';
import fs from 'fs';
import path from 'path';
import { gameState } from './game-state.js';
import { validateOTP, generateCredentials, modhexToHex } from './yubikey-validator.js';

const PORT = process.env.PORT || 3000;

// Load game data (try game-data.json first, fall back to phrases.json)
let dataFile = 'game-data.json';
if (!fs.existsSync(dataFile)) {
  dataFile = 'phrases.json';
}

console.log(`📖 Loading game data from ${dataFile}...`);
try {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

  // game-data.json has a different structure
  const phrasesData = data.phrases || data;

  for (const phrase of phrasesData) {
    const credentials = {
      publicId: phrase.publicId,
      privateId: phrase.privateId,
      privateIdHex: phrase.privateIdHex,
      aesKey: phrase.aesKey,
      aesKeyBytes: Buffer.from(phrase.aesKey, 'hex')
    };

    // Add grid position if available
    const gridPosition = phrase.gridPosition || null;
    gameState.addPhrase(phrase.phrase, credentials, gridPosition);
  }

  console.log(`✅ Loaded ${phrasesData.length} phrases from ${dataFile}\n`);

  if (dataFile === 'game-data.json') {
    console.log('🎮 Game mode: Grid positions loaded (anti-cheat enabled)');
  } else {
    console.log('⚠️  Testing mode: No grid positions (anti-cheat disabled)');
    console.log('   Run "npm run generate-game" to create a full game\n');
  }
} catch (error) {
  console.error('❌ Error loading game data:', error.message);
  console.error('   Run: npm run generate-game');
  process.exit(1);
}

/**
 * Handle incoming HTTP requests
 */
function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Route: Serve static files
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/public/'))) {
    let filePath = url.pathname === '/' ? '/public/index.html' : url.pathname;
    filePath = '.' + filePath;

    const extname = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.css': 'text/css'
    };
    const contentType = contentTypes[extname] || 'text/plain';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    } catch (error) {
      // File not found, continue to API routes
    }
  }

  // Route: Serve frontend-grid.json
  if (req.method === 'GET' && url.pathname === '/frontend-grid.json') {
    try {
      const content = fs.readFileSync('frontend-grid.json');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(content);
      return;
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Grid not found. Run: npm run generate-game' }));
      return;
    }
  }

  // Route: GET /health
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Route: GET /phrases
  if (url.pathname === '/phrases' && req.method === 'GET') {
    const phrases = gameState.getAllPhrases();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ phrases }));
    return;
  }

  // Route: POST /claim
  if (url.pathname === '/claim' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { otp, playerName, startRow, startCol, endRow, endCol } = JSON.parse(body);

        if (!otp || !playerName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing otp or playerName' }));
          return;
        }

        // Require grid coordinates
        if (startRow === undefined || startCol === undefined ||
            endRow === undefined || endCol === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing grid coordinates (startRow, startCol, endRow, endCol)' }));
          return;
        }

        // Validate OTP length first
        if (otp.length !== 44) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid OTP length (must be 44 characters)' }));
          return;
        }

        // Extract public ID from OTP
        const publicId = otp.substring(0, 12);

        // Check if phrase exists
        if (!gameState.hasPhrase(publicId)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Phrase not found in game' }));
          return;
        }

        // Validate OTP cryptographically
        const credentials = gameState.getCredentials(publicId);
        const validation = validateOTP(otp, credentials);

        if (!validation.valid) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: validation.error }));
          return;
        }

        // Check if player already claimed a phrase (one per player limit)
        const alreadyClaimed = gameState.hasPlayerClaimed(playerName);
        if (alreadyClaimed) {
          gameState.recordFailedAttempt(publicId, playerName, 'player_already_won');
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `You already claimed "${alreadyClaimed}"! One phrase per player.`,
            alreadyClaimed
          }));
          return;
        }

        // Verify grid position (anti-cheat)
        const expectedPosition = gameState.getGridPosition(publicId);
        const submittedPosition = { startRow, startCol, endRow, endCol };

        console.log('🔍 Position verification for:', publicId);
        console.log('   Expected:', expectedPosition);
        console.log('   Submitted:', submittedPosition);

        if (!gameState.verifyGridPosition(publicId, startRow, startCol, endRow, endCol)) {
          gameState.recordFailedAttempt(publicId, playerName, 'invalid_position');
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Invalid grid position - phrase not found at those coordinates',
            expected: expectedPosition,
            submitted: submittedPosition
          }));
          return;
        }

        // Check if already claimed (do this BEFORE replay check)
        if (gameState.isClaimed(publicId)) {
          const phrases = gameState.getAllPhrases();
          const claimed = phrases.find(p => p.phrase === publicId);

          // Calculate how close they were
          const claimedTime = new Date(claimed.claimedAt).getTime();
          const attemptTime = Date.now();
          const missedByMs = attemptTime - claimedTime;
          const missedBySec = (missedByMs / 1000).toFixed(2);

          // Find unclaimed phrases to encourage continued play
          const unclaimed = phrases.filter(p => !p.claimed);
          const encouragement = unclaimed.length > 0
            ? `Don't give up! ${unclaimed.length} ${unclaimed.length === 1 ? 'phrase is' : 'phrases are'} still available. Keep searching!`
            : 'All phrases have been claimed. Thanks for playing!';

          gameState.recordFailedAttempt(publicId, playerName, 'already_claimed');

          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Already claimed by ${claimed.claimedBy}`,
            claimedBy: claimed.claimedBy,
            claimedAt: claimed.claimedAt,
            missedBy: `${missedBySec}s`,
            message: `So close! You missed it by ${missedBySec} seconds. ${encouragement}`,
            unclaimedCount: unclaimed.length,
            keepPlaying: unclaimed.length > 0
          }));
          return;
        }

        // Check for replay attack (only for unclaimed phrases)
        if (gameState.isReplay(publicId, validation)) {
          gameState.recordFailedAttempt(publicId, playerName, 'replay_attack');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Replay attack detected' }));
          return;
        }

        // Claim the phrase
        gameState.claimPhrase(publicId, playerName, validation);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          phrase: publicId,
          claimedBy: playerName,
          message: 'Phrase claimed successfully!'
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Route: POST /reset (reload game data without restarting server)
  if (url.pathname === '/reset' && req.method === 'POST') {
    console.log('🔄 Reset requested - reloading game data...');

    try {
      // Clear existing game state
      gameState.phrases.clear();

      // Reload from file
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      const phrasesData = data.phrases || data;

      for (const phrase of phrasesData) {
        const credentials = {
          publicId: phrase.publicId,
          privateId: phrase.privateId,
          privateIdHex: phrase.privateIdHex,
          aesKey: phrase.aesKey,
          aesKeyBytes: Buffer.from(phrase.aesKey, 'hex')
        };
        const gridPosition = phrase.gridPosition || null;
        gameState.addPhrase(phrase.phrase, credentials, gridPosition);
      }

      console.log(`✅ Reloaded ${phrasesData.length} phrases\n`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Game data reloaded',
        phrasesLoaded: phrasesData.length
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Route: GET /credentials/:phrase (for game setup/testing only)
  if (url.pathname.startsWith('/credentials/') && req.method === 'GET') {
    const phrase = url.pathname.split('/')[2];

    if (!gameState.hasPhrase(phrase)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Phrase not found' }));
      return;
    }

    const credentials = gameState.getCredentials(phrase);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ phrase, credentials }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

// Create server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🔑 YubiKey validation server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /phrases - List all phrases and claim status`);
  console.log(`  POST /claim - Claim a phrase with OTP`);
  console.log(`  GET  /credentials/:phrase - Get credentials for a phrase (testing only)`);
});

export { handleRequest };
