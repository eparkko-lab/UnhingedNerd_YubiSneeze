/**
 * In-memory game state management
 * For production, replace with DynamoDB
 */

class GameState {
  constructor() {
    // Map of phrase -> { credentials, claimedBy, claimedAt, lastCounter, lastTimestamp }
    this.phrases = new Map();
  }

  /**
   * Initialize a phrase with its credentials and grid position
   */
  addPhrase(phrase, credentials, gridPosition = null) {
    this.phrases.set(phrase, {
      credentials,
      gridPosition, // { startRow, startCol, endRow, endCol }
      claimedBy: null,
      claimedAt: null,
      lastCounter: -1,
      lastTimestamp: 0,
      attempts: [] // Track all claim attempts
    });
  }

  /**
   * Check if a phrase exists in the game
   */
  hasPhrase(phrase) {
    return this.phrases.has(phrase);
  }

  /**
   * Check if a phrase has been claimed
   */
  isClaimed(phrase) {
    const state = this.phrases.get(phrase);
    return state && state.claimedBy !== null;
  }

  /**
   * Claim a phrase for a player
   */
  claimPhrase(phrase, playerName, validationData) {
    const state = this.phrases.get(phrase);
    if (!state) {
      throw new Error('Phrase not found');
    }
    if (state.claimedBy) {
      throw new Error('Phrase already claimed');
    }

    const claimedAt = new Date().toISOString();
    state.claimedBy = playerName;
    state.claimedAt = claimedAt;
    state.lastCounter = validationData.sessionCounter;
    state.lastTimestamp = validationData.timestamp;

    // Record successful claim attempt
    state.attempts.push({
      playerName,
      success: true,
      timestamp: claimedAt
    });
  }

  /**
   * Record a failed claim attempt
   */
  recordFailedAttempt(phrase, playerName, reason) {
    const state = this.phrases.get(phrase);
    if (!state) return;

    state.attempts.push({
      playerName,
      success: false,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update counter/timestamp for replay detection (without claiming)
   */
  updateLastSeen(phrase, validationData) {
    const state = this.phrases.get(phrase);
    if (!state) return;

    state.lastCounter = validationData.sessionCounter;
    state.lastTimestamp = validationData.timestamp;
  }

  /**
   * Get credentials for a phrase
   */
  getCredentials(phrase) {
    const state = this.phrases.get(phrase);
    return state ? state.credentials : null;
  }

  /**
   * Get grid position for a phrase
   */
  getGridPosition(phrase) {
    const state = this.phrases.get(phrase);
    return state ? state.gridPosition : null;
  }

  /**
   * Verify grid position matches
   */
  verifyGridPosition(phrase, startRow, startCol, endRow, endCol) {
    const position = this.getGridPosition(phrase);
    if (!position) return false; // No position set (testing mode)

    return (
      position.startRow === startRow &&
      position.startCol === startCol &&
      position.endRow === endRow &&
      position.endCol === endCol
    );
  }

  /**
   * Check for replay attacks
   */
  isReplay(phrase, validationData) {
    const state = this.phrases.get(phrase);
    if (!state) return false;

    // First use is never a replay
    if (state.lastCounter === -1) return false;

    // Same exact counter AND timestamp = replay
    if (validationData.sessionCounter === state.lastCounter &&
        validationData.timestamp === state.lastTimestamp) {
      return true;
    }

    // Counter decreased = replay
    if (validationData.sessionCounter < state.lastCounter) {
      return true;
    }

    // Same counter but older timestamp = replay
    if (validationData.sessionCounter === state.lastCounter &&
        validationData.timestamp < state.lastTimestamp) {
      return true;
    }

    return false;
  }

  /**
   * Get all phrases and their claim status
   */
  getAllPhrases() {
    const result = [];
    for (const [phrase, state] of this.phrases.entries()) {
      result.push({
        phrase,
        claimed: state.claimedBy !== null,
        claimedBy: state.claimedBy,
        claimedAt: state.claimedAt,
        attempts: state.attempts || []
      });
    }
    return result;
  }

  /**
   * Check if player has already claimed a phrase
   */
  hasPlayerClaimed(playerName) {
    for (const [phrase, state] of this.phrases.entries()) {
      if (state.claimedBy === playerName) {
        return phrase;
      }
    }
    return null;
  }

  /**
   * Export state for persistence
   */
  export() {
    const data = {};
    for (const [phrase, state] of this.phrases.entries()) {
      data[phrase] = {
        credentials: state.credentials,
        claimedBy: state.claimedBy,
        claimedAt: state.claimedAt,
        lastCounter: state.lastCounter,
        lastTimestamp: state.lastTimestamp
      };
    }
    return data;
  }

  /**
   * Import state from persistence
   */
  import(data) {
    this.phrases.clear();
    for (const [phrase, state] of Object.entries(data)) {
      this.phrases.set(phrase, state);
    }
  }
}

export const gameState = new GameState();
