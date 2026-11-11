// ============================================================================
// Scrabble Game Engine - Scoring System
// ============================================================================

import { CellState, PlacedTile, Position, Direction, MoveResult, ScoredWord, Tile } from './types';
import { BOARD_SIZE, BINGO_BONUS, RACK_SIZE } from './constants';
import { getTileAt, isValidPosition } from './board';

/**
 * Determines the direction of a set of placed tiles.
 * Returns null if tiles don't form a valid line.
 */
export function findDirection(placedTiles: PlacedTile[]): Direction | null {
  if (placedTiles.length === 0) return null;
  if (placedTiles.length === 1) return 'HORIZONTAL'; // Single tile: default to horizontal

  const rows = new Set(placedTiles.map(t => t.position.row));
  const cols = new Set(placedTiles.map(t => t.position.col));

  if (rows.size === 1) return 'HORIZONTAL';
  if (cols.size === 1) return 'VERTICAL';
  return null; // Tiles not in a single row or column
}

/**
 * Collects the full word along a given axis passing through a position.
 * Walks backward and forward from the start position to find the complete word.
 */
function collectWord(
  board: CellState[][],
  startPos: Position,
  direction: Direction
): { tiles: { tile: Tile; position: Position; isNew: boolean }[] } | null {
  const dRow = direction === 'VERTICAL' ? 1 : 0;
  const dCol = direction === 'HORIZONTAL' ? 1 : 0;

  // Walk backward to find the start of the word
  let row = startPos.row;
  let col = startPos.col;
  while (true) {
    const prevRow = row - dRow;
    const prevCol = col - dCol;
    const prevPos = { row: prevRow, col: prevCol };
    if (!isValidPosition(prevPos) || !getTileAt(board, prevPos)) break;
    row = prevRow;
    col = prevCol;
  }

  // Walk forward to collect all tiles in the word
  const tiles: { tile: Tile; position: Position; isNew: boolean }[] = [];
  while (true) {
    const pos = { row, col };
    if (!isValidPosition(pos)) break;
    const tile = getTileAt(board, pos);
    if (!tile) break;
    tiles.push({ tile, position: pos, isNew: false });
    row += dRow;
    col += dCol;
  }

  if (tiles.length < 2) return null; // A single letter is not a word
  return { tiles };
}

/**
 * Scores a single word given tiles with premium information.
 * Premiums are only applied to newly placed tiles.
 */
function scoreWordTiles(
  wordTiles: { tile: Tile; position: Position; isNew: boolean }[],
  board: CellState[][]
): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const { tile, position, isNew } of wordTiles) {
    let letterScore = tile.points;

    if (isNew) {
      const premium = board[position.row][position.col].premium;
      switch (premium) {
        case 'DL':
          letterScore *= 2;
          break;
        case 'TL':
          letterScore *= 3;
          break;
        case 'DW':
        case 'CENTER':
          wordMultiplier *= 2;
          break;
        case 'TW':
          wordMultiplier *= 3;
          break;
      }
    }

    wordScore += letterScore;
  }

  return wordScore * wordMultiplier;
}

/**
 * Gets the main word formed by the placed tiles.
 */
export function getMainWord(
  board: CellState[][],
  placedTiles: PlacedTile[],
  direction: Direction
): ScoredWord | null {
  if (placedTiles.length === 0) return null;

  // Use the first placed tile's position as starting point
  const wordData = collectWord(board, placedTiles[0].position, direction);
  if (!wordData) return null;

  // Mark which tiles are newly placed
  const newPositionKeys = new Set(
    placedTiles.map(pt => `${pt.position.row},${pt.position.col}`)
  );
  for (const wt of wordData.tiles) {
    wt.isNew = newPositionKeys.has(`${wt.position.row},${wt.position.col}`);
  }

  const word = wordData.tiles.map(wt => wt.tile.letter || '?').join('');
  const score = scoreWordTiles(wordData.tiles, board);
  const positions = wordData.tiles.map(wt => wt.position);

  return { word, score, positions };
}

/**
 * Gets all cross-words formed by the placed tiles.
 * A cross-word is formed perpendicular to the main direction at each newly placed tile.
 */
export function getCrossWords(
  board: CellState[][],
  placedTiles: PlacedTile[],
  direction: Direction
): ScoredWord[] {
  const crossDirection: Direction = direction === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL';
  const crossWords: ScoredWord[] = [];

  const newPositionKeys = new Set(
    placedTiles.map(pt => `${pt.position.row},${pt.position.col}`)
  );

  for (const pt of placedTiles) {
    const wordData = collectWord(board, pt.position, crossDirection);
    if (!wordData) continue; // No cross-word at this position

    // Mark new tiles
    for (const wt of wordData.tiles) {
      wt.isNew = newPositionKeys.has(`${wt.position.row},${wt.position.col}`);
    }

    const word = wordData.tiles.map(wt => wt.tile.letter || '?').join('');
    const score = scoreWordTiles(wordData.tiles, board);
    const positions = wordData.tiles.map(wt => wt.position);

    crossWords.push({ word, score, positions });
  }

  return crossWords;
}

/**
 * Calculates the total score for a move.
 * The board MUST already have the tiles placed on it.
 * 
 * @param boardBeforePlacement - The board state BEFORE placing tiles (for premium detection)
 * @param boardAfterPlacement - The board state AFTER placing tiles (for word collection)
 * @param placedTiles - The tiles that were placed this turn
 * @returns MoveResult with score and word details
 */
export function calculateMoveScore(
  board: CellState[][],
  placedTiles: PlacedTile[]
): MoveResult {
  if (placedTiles.length === 0) {
    return { valid: false, score: 0, words: [], error: 'No tiles placed' };
  }

  const direction = findDirection(placedTiles);
  if (direction === null) {
    return { valid: false, score: 0, words: [], error: 'Tiles must be in a single row or column' };
  }

  const allWords: ScoredWord[] = [];
  let totalScore = 0;

  // Get the main word
  const mainWord = getMainWord(board, placedTiles, direction);
  if (mainWord) {
    allWords.push(mainWord);
    totalScore += mainWord.score;
  }

  // Get cross words
  const crossWords = getCrossWords(board, placedTiles, direction);
  for (const cw of crossWords) {
    allWords.push(cw);
    totalScore += cw.score;
  }

  // If only one tile placed and no words formed, it may be invalid
  if (allWords.length === 0) {
    return { valid: false, score: 0, words: [], error: 'No valid words formed' };
  }

  // Add bingo bonus if all 7 tiles were used
  if (placedTiles.length >= RACK_SIZE) {
    totalScore += BINGO_BONUS;
  }

  return { valid: true, score: totalScore, words: allWords };
}
