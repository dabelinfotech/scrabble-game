// ============================================================================
// Scrabble Game Engine - Move Validator
// ============================================================================

import { CellState, PlacedTile, Position, Direction, MoveResult, ScoredWord } from './types';
import { BOARD_SIZE, CENTER_ROW, CENTER_COL } from './constants';
import { getTileAt, isBoardEmpty, isPositionOccupied, placeTiles, isValidPosition } from './board';
import { calculateMoveScore, findDirection } from './scoring';
import { Trie } from './dictionary';

/**
 * Checks whether all placed tiles are contiguous with existing tiles along their direction.
 * There should be no gaps in the line of tiles between the first and last placed tile.
 */
export function areTilesContiguous(
  board: CellState[][],
  placedTiles: PlacedTile[],
  direction: Direction
): boolean {
  if (placedTiles.length <= 1) return true;

  const isHoriz = direction === 'HORIZONTAL';

  // Sort by position along the direction
  const sorted = [...placedTiles].sort((a, b) => {
    if (isHoriz) return a.position.col - b.position.col;
    return a.position.row - b.position.row;
  });

  const firstPos = sorted[0].position;
  const lastPos = sorted[sorted.length - 1].position;

  // Check every cell between first and last is occupied (by existing or new tiles)
  const newTileKeys = new Set(placedTiles.map(pt => `${pt.position.row},${pt.position.col}`));

  if (isHoriz) {
    const row = firstPos.row;
    for (let col = firstPos.col; col <= lastPos.col; col++) {
      const key = `${row},${col}`;
      const hasExisting = getTileAt(board, { row, col }) !== null;
      const hasNew = newTileKeys.has(key);
      if (!hasExisting && !hasNew) return false;
    }
  } else {
    const col = firstPos.col;
    for (let row = firstPos.row; row <= lastPos.row; row++) {
      const key = `${row},${col}`;
      const hasExisting = getTileAt(board, { row, col }) !== null;
      const hasNew = newTileKeys.has(key);
      if (!hasExisting && !hasNew) return false;
    }
  }

  return true;
}

/**
 * Checks whether the placed tiles connect to at least one existing tile on the board.
 */
export function connectsToExisting(board: CellState[][], placedTiles: PlacedTile[]): boolean {
  for (const pt of placedTiles) {
    const { row, col } = pt.position;
    // Check all four neighbors
    const neighbors: Position[] = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
    for (const neighbor of neighbors) {
      if (
        isValidPosition(neighbor) &&
        isPositionOccupied(board, neighbor)
      ) {
        return true;
      }
    }
  }

  // Also check if any placed tile fills a gap between existing tiles
  // (this is covered by adjacency above, but we also check along the line)
  const direction = findDirection(placedTiles);
  if (direction) {
    const isHoriz = direction === 'HORIZONTAL';
    const sorted = [...placedTiles].sort((a, b) =>
      isHoriz ? a.position.col - b.position.col : a.position.row - b.position.row
    );
    const firstPos = sorted[0].position;
    const lastPos = sorted[sorted.length - 1].position;

    if (isHoriz) {
      const row = firstPos.row;
      for (let col = firstPos.col; col <= lastPos.col; col++) {
        if (getTileAt(board, { row, col }) !== null) {
          return true; // There's an existing tile in the line
        }
      }
    } else {
      const col = firstPos.col;
      for (let row = firstPos.row; row <= lastPos.row; row++) {
        if (getTileAt(board, { row, col }) !== null) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Collects a full word string along an axis starting from a position on the updated board.
 */
function collectWordString(
  board: CellState[][],
  startPos: Position,
  direction: Direction
): string {
  const dRow = direction === 'VERTICAL' ? 1 : 0;
  const dCol = direction === 'HORIZONTAL' ? 1 : 0;

  // Walk backward
  let row = startPos.row;
  let col = startPos.col;
  while (true) {
    const prevRow = row - dRow;
    const prevCol = col - dCol;
    if (!isValidPosition({ row: prevRow, col: prevCol })) break;
    if (!getTileAt(board, { row: prevRow, col: prevCol })) break;
    row = prevRow;
    col = prevCol;
  }

  // Walk forward collecting letters
  let word = '';
  while (true) {
    if (!isValidPosition({ row, col })) break;
    const tile = getTileAt(board, { row, col });
    if (!tile) break;
    word += tile.letter || '?';
    row += dRow;
    col += dCol;
  }

  return word;
}

/**
 * Validates a complete move and returns the scored result.
 * 
 * @param board - Current board state (BEFORE placing tiles)
 * @param placedTiles - Tiles the player wants to place
 * @param dictionary - The Trie dictionary for word validation
 * @param isFirstMove - Whether this is the first move of the game
 * @returns MoveResult indicating validity, score, and formed words
 */
export function validateMove(
  board: CellState[][],
  placedTiles: PlacedTile[],
  dictionary: Trie,
  isFirstMove: boolean
): MoveResult {
  // 1. Must place at least one tile
  if (placedTiles.length === 0) {
    return { valid: false, score: 0, words: [], error: 'No tiles placed' };
  }

  // 2. All positions must be within bounds
  for (const pt of placedTiles) {
    if (!isValidPosition(pt.position)) {
      return {
        valid: false, score: 0, words: [],
        error: `Position (${pt.position.row}, ${pt.position.col}) is out of bounds`,
      };
    }
  }

  // 3. No position can already be occupied
  for (const pt of placedTiles) {
    if (isPositionOccupied(board, pt.position)) {
      return {
        valid: false, score: 0, words: [],
        error: `Position (${pt.position.row}, ${pt.position.col}) is already occupied`,
      };
    }
  }

  // 4. No duplicate positions in placed tiles
  const posKeys = new Set<string>();
  for (const pt of placedTiles) {
    const key = `${pt.position.row},${pt.position.col}`;
    if (posKeys.has(key)) {
      return {
        valid: false, score: 0, words: [],
        error: `Duplicate position: (${pt.position.row}, ${pt.position.col})`,
      };
    }
    posKeys.add(key);
  }

  // 5. Tiles must all be in the same row or column
  const direction = findDirection(placedTiles);
  if (direction === null) {
    return {
      valid: false, score: 0, words: [],
      error: 'Tiles must be placed in a single row or column',
    };
  }

  // 6. First move must cover center square
  if (isFirstMove) {
    const coversCenter = placedTiles.some(
      pt => pt.position.row === CENTER_ROW && pt.position.col === CENTER_COL
    );
    if (!coversCenter) {
      return {
        valid: false, score: 0, words: [],
        error: 'First move must cover the center square',
      };
    }
    // First move must form a word of at least 2 letters
    if (placedTiles.length < 2) {
      return {
        valid: false, score: 0, words: [],
        error: 'First move must place at least 2 tiles',
      };
    }
  }

  // 7. Tiles must be contiguous (no gaps unless filled by existing tiles)
  if (!areTilesContiguous(board, placedTiles, direction)) {
    return {
      valid: false, score: 0, words: [],
      error: 'Tiles must be placed contiguously (no gaps)',
    };
  }

  // 8. Must connect to existing tiles (unless first move)
  if (!isFirstMove) {
    if (!connectsToExisting(board, placedTiles)) {
      return {
        valid: false, score: 0, words: [],
        error: 'Tiles must connect to existing tiles on the board',
      };
    }
  }

  // 9. Place tiles on a temporary board to evaluate words
  const tempBoard = placeTiles(board, placedTiles);

  // 10. Calculate score (also finds all formed words)
  const result = calculateMoveScore(tempBoard, placedTiles);
  if (!result.valid) {
    return result;
  }

  // 11. Validate all formed words against the dictionary
  for (const scoredWord of result.words) {
    const wordUpper = scoredWord.word.toUpperCase();
    if (!dictionary.search(wordUpper)) {
      return {
        valid: false,
        score: 0,
        words: result.words,
        error: `"${scoredWord.word}" is not a valid word`,
      };
    }
  }

  return result;
}
