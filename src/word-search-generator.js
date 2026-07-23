/**
 * Word Search Grid Generator
 * Generates grids with embedded modhex phrases and tracks their positions
 */

const MODHEX = 'cbdefghijklnrtuv';

/**
 * Direction vectors for word placement
 */
const DIRECTIONS = {
  horizontal: { dr: 0, dc: 1 },
  vertical: { dr: 1, dc: 0 },
  diagonalDown: { dr: 1, dc: 1 },
  diagonalUp: { dr: -1, dc: 1 },
  horizontalBack: { dr: 0, dc: -1 },
  verticalBack: { dr: -1, dc: 0 },
  diagonalDownBack: { dr: -1, dc: -1 },
  diagonalUpBack: { dr: 1, dc: -1 }
};

/**
 * Generate a word search grid with phrases
 */
export function generateGrid(phrases, gridSize = 20) {
  // Initialize empty grid
  const grid = Array(gridSize).fill(null).map(() =>
    Array(gridSize).fill('')
  );

  // Track phrase positions
  const phrasePositions = {};

  // Place each phrase
  for (const phrase of phrases) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      attempts++;

      // Pick random direction
      const directionKeys = Object.keys(DIRECTIONS);
      const directionKey = directionKeys[Math.floor(Math.random() * directionKeys.length)];
      const direction = DIRECTIONS[directionKey];

      // Pick random starting position
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);

      // Check if phrase fits
      const endRow = startRow + direction.dr * (phrase.length - 1);
      const endCol = startCol + direction.dc * (phrase.length - 1);

      if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) {
        continue; // Out of bounds
      }

      // Check if all cells are empty or match
      let canPlace = true;
      for (let i = 0; i < phrase.length; i++) {
        const row = startRow + direction.dr * i;
        const col = startCol + direction.dc * i;
        const cell = grid[row][col];

        if (cell !== '' && cell !== phrase[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        // Place the phrase
        for (let i = 0; i < phrase.length; i++) {
          const row = startRow + direction.dr * i;
          const col = startCol + direction.dc * i;
          grid[row][col] = phrase[i];
        }

        phrasePositions[phrase] = {
          startRow,
          startCol,
          endRow,
          endCol,
          direction: directionKey
        };

        placed = true;
      }
    }

    if (!placed) {
      throw new Error(`Could not place phrase: ${phrase} after ${maxAttempts} attempts`);
    }
  }

  // Fill empty cells with random modhex characters
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = MODHEX[Math.floor(Math.random() * MODHEX.length)];
      }
    }
  }

  return {
    grid,
    phrasePositions,
    gridSize
  };
}

/**
 * Format grid as a string for display
 */
export function formatGrid(grid) {
  return grid.map(row => row.join(' ')).join('\n');
}

/**
 * Export grid data for frontend
 */
export function exportGridData(grid, phrasePositions, phrases) {
  return {
    grid,
    gridSize: grid.length,
    phrases: phrases.map(phrase => ({
      phrase,
      length: phrase.length
      // Don't include positions in export - they stay server-side!
    })),
    // Positions are stored separately on server for validation
    _positions: phrasePositions
  };
}
