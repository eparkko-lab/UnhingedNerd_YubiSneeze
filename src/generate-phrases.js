import { generateCredentials, hexToModhex } from './yubikey-validator.js';
import { gameState } from './game-state.js';
import fs from 'fs';

/**
 * Convert ASCII string to modhex (if possible)
 */
function stringToModhex(str) {
  // Check if string only contains modhex characters
  const modhex = 'cbdefghijklnrtuv';
  for (const c of str.toLowerCase()) {
    if (!modhex.includes(c)) {
      throw new Error(`Character '${c}' not in modhex alphabet`);
    }
  }
  return str.toLowerCase();
}

/**
 * Generate example phrases for the game
 */
function generateExamplePhrases() {
  const phrases = [
    'unhingednerd', // 12 chars, all modhex!
    'defcbdefcbde',
    'yubikeyfight',
    'hackthecdefe',
    'findthecredi',
  ];

  const results = [];

  for (const phrase of phrases) {
    try {
      const modhexPhrase = stringToModhex(phrase);
      if (modhexPhrase.length !== 12) {
        console.log(`⚠️  Skipping '${phrase}' - not 12 characters`);
        continue;
      }

      const credentials = generateCredentials(modhexPhrase);
      gameState.addPhrase(modhexPhrase, credentials);

      results.push({
        phrase: modhexPhrase,
        publicId: credentials.publicId,
        privateId: credentials.privateId,
        privateIdHex: credentials.privateIdHex,
        aesKey: credentials.aesKey,
        programmingCommand: `ykman otp yubiotp --public-id ${credentials.publicId} --private-id ${credentials.privateIdHex} --key ${credentials.aesKey} 1`
      });

      console.log(`✅ Generated credentials for: ${modhexPhrase}`);
    } catch (error) {
      console.log(`⚠️  Skipping '${phrase}': ${error.message}`);
    }
  }

  // Save to file
  fs.writeFileSync(
    'phrases.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n💾 Saved ${results.length} phrases to phrases.json`);
  console.log(`\n🎮 Game state initialized with ${gameState.phrases.size} phrases`);

  return results;
}

// Run if executed directly
const isMainModule = process.argv[1]?.endsWith('generate-phrases.js');
if (isMainModule) {
  generateExamplePhrases();
}

export { generateExamplePhrases };
