/**
 * Generate a complete game with word search grid and phrase positions
 * This is what you'd run to set up a new game
 */

import { generateGrid, formatGrid } from './src/word-search-generator.js';
import { generateCredentials } from './src/yubikey-validator.js';
import fs from 'fs';

// Configuration
const CONFIG = {
  gridSize: 14,  // Smaller grid = easier to find
  phrases: [
    'unhingednerd',
    'defcbdefcbde',
    'findthecredi'
  ]
};

console.log('🎮 Generating Word Search Game\n');
console.log(`Grid size: ${CONFIG.gridSize}x${CONFIG.gridSize}`);
console.log(`Phrases: ${CONFIG.phrases.length}`);
console.log();

// Generate grid with phrases
console.log('📐 Generating word search grid...');
const { grid, phrasePositions, gridSize } = generateGrid(CONFIG.phrases, CONFIG.gridSize);

console.log('✅ Grid generated!\n');
console.log(formatGrid(grid));
console.log();

// Generate credentials for each phrase
console.log('🔑 Generating YubiKey credentials...\n');
const gameData = [];

for (const phrase of CONFIG.phrases) {
  const credentials = generateCredentials(phrase);
  const position = phrasePositions[phrase];

  gameData.push({
    phrase,
    publicId: credentials.publicId,
    privateId: credentials.privateId,
    privateIdHex: credentials.privateIdHex,
    aesKey: credentials.aesKey,
    gridPosition: {
      startRow: position.startRow,
      startCol: position.startCol,
      endRow: position.endRow,
      endCol: position.endCol
    },
    programmingCommand: `ykman otp yubiotp --public-id ${credentials.publicId} --private-id ${credentials.privateIdHex} --key ${credentials.aesKey} 1`
  });

  console.log(`✅ ${phrase}`);
  console.log(`   Position: (${position.startRow},${position.startCol}) → (${position.endRow},${position.endCol}) [${position.direction}]`);
  console.log(`   Private ID: ${credentials.privateIdHex}`);
  console.log();
}

// Save to file
fs.writeFileSync('game-data.json', JSON.stringify({
  gridSize,
  grid,
  phrases: gameData
}, null, 2));

console.log('💾 Saved game data to game-data.json');
console.log();

// Export frontend grid (without positions)
const frontendGrid = {
  gridSize,
  grid,
  phrases: CONFIG.phrases.map(phrase => ({ phrase, length: phrase.length }))
};

fs.writeFileSync('frontend-grid.json', JSON.stringify(frontendGrid, null, 2));

console.log('💾 Saved frontend grid to frontend-grid.json');
console.log('   (Grid positions are hidden from frontend)');
console.log();

console.log('🎯 Next steps:');
console.log('1. Reload server data (without restart):');
console.log('   curl -X POST http://localhost:3000/reset');
console.log('2. OR restart server manually');
console.log('3. Hard refresh browser (Ctrl+Shift+R)');
console.log();

// Auto-reset server if it's running
console.log('🔄 Attempting to reset server...');
try {
  const http = await import('http');
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/reset',
    method: 'POST'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Server reset successful!');
        console.log('💡 Hard refresh your browser (Ctrl+Shift+R) to see the new game');
      } else {
        console.log('⚠️  Server reset failed. Restart server manually: npm run dev');
      }
    });
  });

  req.on('error', () => {
    console.log('⚠️  Server not running. Start it with: npm run dev');
  });

  req.end();
} catch (error) {
  console.log('⚠️  Could not auto-reset. Restart server manually: npm run dev');
}
