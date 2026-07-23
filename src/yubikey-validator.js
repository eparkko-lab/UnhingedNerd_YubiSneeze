import crypto from 'crypto';

/**
 * Modhex character set used by YubiKey
 */
const MODHEX = 'cbdefghijklnrtuv';

/**
 * Convert hex string to modhex
 */
export function hexToModhex(hex) {
  return hex.split('').map(c => {
    const val = parseInt(c, 16);
    return MODHEX[val];
  }).join('');
}

/**
 * Convert modhex string to hex
 */
export function modhexToHex(modhex) {
  return modhex.split('').map(c => {
    const val = MODHEX.indexOf(c);
    if (val === -1) throw new Error(`Invalid modhex character: ${c}`);
    return val.toString(16);
  }).join('');
}

/**
 * Generate a random modhex string of specified length
 */
export function generateRandomModhex(length) {
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  const hex = bytes.toString('hex').substring(0, length);
  return hexToModhex(hex);
}

/**
 * Generate YubiKey credentials for a phrase
 * @param {string} phrase - 12 character modhex phrase (public ID)
 * @returns {Object} credentials with publicId, privateId, and aesKey
 */
export function generateCredentials(phrase) {
  if (phrase.length !== 12) {
    throw new Error('Phrase must be 12 characters');
  }

  // Validate modhex
  for (const c of phrase) {
    if (!MODHEX.includes(c)) {
      throw new Error(`Invalid modhex character: ${c}`);
    }
  }

  // Generate 6 bytes (12 hex chars) for private ID
  const privateIdBytes = crypto.randomBytes(6);
  const privateIdHex = privateIdBytes.toString('hex');
  const privateId = hexToModhex(privateIdHex);

  // Generate 16 bytes for AES key
  const aesKeyBytes = crypto.randomBytes(16);
  const aesKey = aesKeyBytes.toString('hex');

  return {
    publicId: phrase,
    privateId,
    privateIdHex,
    aesKey,
    aesKeyBytes
  };
}

/**
 * Decrypt and validate a YubiKey OTP
 * @param {string} otp - The full OTP string from YubiKey
 * @param {Object} credentials - The credentials object from generateCredentials
 * @returns {Object|null} Decrypted token data if valid, null if invalid
 */
export function validateOTP(otp, credentials) {
  try {
    // OTP format: publicId (12 chars) + encrypted token (32 chars) = 44 chars modhex
    if (otp.length !== 44) {
      return { valid: false, error: 'Invalid OTP length' };
    }

    const publicId = otp.substring(0, 12);
    const encryptedToken = otp.substring(12);

    // Check public ID matches
    if (publicId !== credentials.publicId) {
      return { valid: false, error: 'Public ID mismatch' };
    }

    // Convert modhex to hex
    const encryptedHex = modhexToHex(encryptedToken);
    const encryptedBytes = Buffer.from(encryptedHex, 'hex');

    // Decrypt using AES-128-ECB
    const decipher = crypto.createDecipheriv('aes-128-ecb', credentials.aesKeyBytes, null);
    decipher.setAutoPadding(false);

    const decrypted = Buffer.concat([
      decipher.update(encryptedBytes),
      decipher.final()
    ]);

    // Parse decrypted token (16 bytes)
    const privateId = decrypted.subarray(0, 6);
    const sessionCounter = decrypted.readUInt8(6);
    const timestamp = decrypted.readUIntLE(7, 3);
    const sessionUse = decrypted.readUInt8(10);
    const randomData = decrypted.readUInt16LE(11);
    const crc = decrypted.readUInt16LE(14);

    // Verify CRC using residue method
    // YubiOTP spec: CRC calculated over all 16 bytes should equal 0xF0B8
    const crcResidue = calculateCRC(decrypted);
    if (crcResidue !== 0xF0B8) {
      return { valid: false, error: 'CRC check failed' };
    }

    // Verify private ID
    const privateIdHex = privateId.toString('hex');
    if (privateIdHex !== credentials.privateIdHex) {
      return { valid: false, error: 'Private ID mismatch' };
    }

    return {
      valid: true,
      publicId,
      sessionCounter,
      timestamp,
      sessionUse,
      randomData
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Calculate ISO 13239 CRC-16 checksum
 */
function calculateCRC(data) {
  let crc = 0xffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      const odd = crc & 1;
      crc >>= 1;
      if (odd) {
        crc ^= 0x8408;
      }
    }
  }

  return crc;
}
