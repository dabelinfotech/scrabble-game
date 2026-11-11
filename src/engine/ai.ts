// ============================================================================
// Scrabble Game Engine - AI Opponent
// ============================================================================

import {
  CellState, Tile, Position, PlacedTile, Direction, AIDifficulty, MoveResult,
} from './types';
import { BOARD_SIZE, CENTER_ROW, CENTER_COL, LETTER_VALUES } from './constants';
import {
  getTileAt, isBoardEmpty, isValidPosition, getOccupiedPositions, placeTiles,
} from './board';
import { Trie } from './dictionary';
import { validateMove } from './moveValidator';

interface CandidateMove {
  tiles: PlacedTile[];
  score: number;
  words: string[];
}

/**
 * Finds anchor positions — empty cells adjacent to at least one existing tile.
 * These are the positions where new words can start or extend through.
 */
export function findAnchors(board: CellState[][]): Position[] {
  const anchors: Position[] = [];
  const occupied = new Set(
    getOccupiedPositions(board).map(p => `${p.row},${p.col}`)
  );

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (occupied.has(`${row},${col}`)) continue; // Skip occupied cells

      // Check if adjacent to an occupied cell
      const neighbors: Position[] = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];

      for (const n of neighbors) {
        if (isValidPosition(n) && occupied.has(`${n.row},${n.col}`)) {
          anchors.push({ row, col });
          break;
        }
      }
    }
  }

  return anchors;
}

/**
 * Generates all unique permutations of tiles from the rack up to a given length.
 */
function getPermutations(tiles: Tile[], minLen: number, maxLen: number): Tile[][] {
  const results: Tile[][] = [];

  function permute(current: Tile[], remaining: Tile[]) {
    if (current.length >= minLen) {
      results.push([...current]);
    }
    if (current.length >= maxLen) return;

    const used = new Set<string>(); // Avoid duplicate letters at same position
    for (let i = 0; i < remaining.length; i++) {
      const key = remaining[i].isBlank ? `BLANK_${remaining[i].id}` : remaining[i].letter;
      if (used.has(remaining[i].letter) && !remaining[i].isBlank) continue;
      used.add(remaining[i].letter);

      current.push(remaining[i]);
      const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      permute(current, newRemaining);
      current.pop();
    }
  }

  permute([], tiles);
  return results;
}

/**
 * Generates combinations of tiles from the rack.
 */
function getCombinations(tiles: Tile[], size: number): Tile[][] {
  const results: Tile[][] = [];

  function combine(start: number, current: Tile[]) {
    if (current.length === size) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < tiles.length; i++) {
      current.push(tiles[i]);
      combine(i + 1, current);
      current.pop();
    }
  }

  combine(0, []);
  return results;
}

/**
 * Tries to place a word at a specific position and direction.
 * Returns the placed tiles if valid, or null.
 */
function tryPlaceWord(
  board: CellState[][],
  word: string,
  startPos: Position,
  direction: Direction,
  rack: Tile[],
  dictionary: Trie,
  isFirstMove: boolean
): CandidateMove | null {
  const dRow = direction === 'VERTICAL' ? 1 : 0;
  const dCol = direction === 'HORIZONTAL' ? 1 : 0;

  const placedTiles: PlacedTile[] = [];
  const usedRackTiles = new Set<string>();
  const availableRack = [...rack];

  for (let i = 0; i < word.length; i++) {
    const row = startPos.row + i * dRow;
    const col = startPos.col + i * dCol;
    const pos = { row, col };

    if (!isValidPosition(pos)) return null;

    const existingTile = getTileAt(board, pos);

    if (existingTile) {
      // Position already has a tile - it must match the word letter
      if (existingTile.letter !== word[i]) return null;
      // Don't place a tile here, it's already on the board
    } else {
      // Need to place a tile from the rack
      const letter = word[i];
      let foundIdx = -1;

      // Try to find the letter in remaining rack tiles
      for (let j = 0; j < availableRack.length; j++) {
        if (availableRack[j].letter === letter && !usedRackTiles.has(availableRack[j].id)) {
          foundIdx = j;
          break;
        }
      }

      // If not found, try a blank tile
      if (foundIdx === -1) {
        for (let j = 0; j < availableRack.length; j++) {
          if (availableRack[j].isBlank && !usedRackTiles.has(availableRack[j].id)) {
            foundIdx = j;
            break;
          }
        }
      }

      if (foundIdx === -1) return null; // Can't form this word

      const usedTile = availableRack[foundIdx];
      usedRackTiles.add(usedTile.id);
      availableRack.splice(foundIdx, 1);

      const placedTile: Tile = usedTile.isBlank
        ? { ...usedTile, letter, points: 0 }
        : { ...usedTile };

      placedTiles.push({ tile: placedTile, position: pos });
    }
  }

  if (placedTiles.length === 0) return null; // No new tiles placed

  // Validate the complete move
  const result = validateMove(board, placedTiles, dictionary, isFirstMove);
  if (!result.valid) return null;

  return {
    tiles: placedTiles,
    score: result.score,
    words: result.words.map(w => w.word),
  };
}

/**
 * Generates candidate moves at a specific anchor position and direction.
 */
export function generateMovesAtAnchor(
  board: CellState[][],
  rack: Tile[],
  anchor: Position,
  direction: Direction,
  dictionary: Trie
): CandidateMove[] {
  const moves: CandidateMove[] = [];
  const isFirstMove = isBoardEmpty(board);
  const dRow = direction === 'VERTICAL' ? 1 : 0;
  const dCol = direction === 'HORIZONTAL' ? 1 : 0;

  // Try placing words that pass through this anchor
  // Determine how far back we can start (limited by board edge and existing tiles gap)
  let maxPrefix = 0;
  for (let i = 1; i <= rack.length; i++) {
    const testRow = anchor.row - i * dRow;
    const testCol = anchor.col - i * dCol;
    const testPos = { row: testRow, col: testCol };
    if (!isValidPosition(testPos)) break;
    if (getTileAt(board, testPos) !== null) break;
    maxPrefix = i;
  }

  // Get rack letters for word lookup
  const rackLetters = rack.map(t => t.isBlank ? '*' : t.letter);

  // Try various start positions
  for (let prefixLen = 0; prefixLen <= maxPrefix; prefixLen++) {
    const startRow = anchor.row - prefixLen * dRow;
    const startCol = anchor.col - prefixLen * dCol;
    const startPos = { row: startRow, col: startCol };

    // Try word lengths from 2 to rack.length + existing tiles along path
    for (let wordLen = 2; wordLen <= rack.length + prefixLen + 4; wordLen++) {
      // Check end position is valid
      const endRow = startRow + (wordLen - 1) * dRow;
      const endCol = startCol + (wordLen - 1) * dCol;
      if (!isValidPosition({ row: endRow, col: endCol })) break;

      // Build a pattern: known letters at positions with existing tiles, blanks elsewhere
      let pattern = '';
      let neededFromRack = 0;
      let valid = true;

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dRow;
        const c = startCol + i * dCol;
        const tile = getTileAt(board, { row: r, col: c });
        if (tile) {
          pattern += tile.letter;
        } else {
          pattern += '?';
          neededFromRack++;
        }
      }

      if (neededFromRack === 0 || neededFromRack > rack.length) continue;

      // Find words matching this pattern from the dictionary
      const matchingWords = findWordsMatchingPattern(pattern, rackLetters, dictionary);

      for (const word of matchingWords) {
        const candidate = tryPlaceWord(board, word, startPos, direction, rack, dictionary, isFirstMove);
        if (candidate) {
          moves.push(candidate);
        }
      }
    }
  }

  return moves;
}

/**
 * Finds words in the dictionary matching a pattern.
 * Pattern uses letters for fixed positions and '?' for positions needing rack tiles.
 * rackLetters contains available letters (* for blank).
 */
function findWordsMatchingPattern(
  pattern: string,
  rackLetters: string[],
  dictionary: Trie
): string[] {
  const results: string[] = [];
  const available = [...rackLetters];

  function backtrack(index: number, current: string, remaining: string[]) {
    if (index === pattern.length) {
      if (dictionary.search(current)) {
        results.push(current);
      }
      return;
    }

    if (results.length > 50) return; // Limit results for performance

    const ch = pattern[index];
    if (ch !== '?') {
      // Fixed letter from board
      if (!dictionary.startsWithPrefix(current + ch)) return;
      backtrack(index + 1, current + ch, remaining);
    } else {
      // Need a letter from rack
      const tried = new Set<string>();
      for (let i = 0; i < remaining.length; i++) {
        const tile = remaining[i];
        if (tile === '*') {
          // Blank tile - try all 26 letters
          for (let c = 65; c <= 90; c++) {
            const letter = String.fromCharCode(c);
            const tryWord = current + letter;
            if (!dictionary.startsWithPrefix(tryWord)) continue;
            const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
            backtrack(index + 1, tryWord, newRemaining);
          }
        } else {
          if (tried.has(tile)) continue;
          tried.add(tile);
          const tryWord = current + tile;
          if (!dictionary.startsWithPrefix(tryWord)) continue;
          const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
          backtrack(index + 1, tryWord, newRemaining);
        }
      }
    }
  }

  backtrack(0, '', available);
  return results;
}

/**
 * Generates an AI move based on difficulty level.
 */
export function generateAIMove(
  board: CellState[][],
  rack: Tile[],
  dictionary: Trie,
  difficulty: AIDifficulty
): PlacedTile[] {
  const isFirstMove = isBoardEmpty(board);
  let allCandidates: CandidateMove[] = [];

  if (isFirstMove) {
    // For the first move, try placing words through the center
    allCandidates = generateFirstMoveCandidates(board, rack, dictionary);
  } else {
    // Find anchors and generate moves at each
    const anchors = findAnchors(board);
    const directions: Direction[] = ['HORIZONTAL', 'VERTICAL'];

    for (const anchor of anchors) {
      for (const dir of directions) {
        const moves = generateMovesAtAnchor(board, rack, anchor, dir, dictionary);
        allCandidates.push(...moves);

        // For EASY, stop early once we have enough candidates
        if (difficulty === 'EASY' && allCandidates.length >= 10) break;
      }
      if (difficulty === 'EASY' && allCandidates.length >= 10) break;
    }
  }

  if (allCandidates.length === 0) {
    return []; // No valid moves found - AI should pass or exchange
  }

  // Sort by score descending
  allCandidates.sort((a, b) => b.score - a.score);

  // Remove duplicate moves (same positions and tiles)
  const uniqueCandidates = deduplicateMoves(allCandidates);

  // Select move based on difficulty
  const selected = selectMoveByDifficulty(uniqueCandidates, difficulty);
  return selected.tiles;
}

/**
 * Generates first move candidates that pass through the center square.
 */
function generateFirstMoveCandidates(
  board: CellState[][],
  rack: Tile[],
  dictionary: Trie
): CandidateMove[] {
  const candidates: CandidateMove[] = [];
  const rackLetters = rack.map(t => t.isBlank ? '*' : t.letter);
  const directions: Direction[] = ['HORIZONTAL', 'VERTICAL'];

  for (const direction of directions) {
    const dRow = direction === 'VERTICAL' ? 1 : 0;
    const dCol = direction === 'HORIZONTAL' ? 1 : 0;

    // Try different starting positions that pass through center
    for (let offset = 0; offset < Math.min(rack.length, 7); offset++) {
      const startRow = CENTER_ROW - offset * dRow;
      const startCol = CENTER_COL - offset * dCol;

      if (!isValidPosition({ row: startRow, col: startCol })) continue;

      for (let wordLen = 2; wordLen <= rack.length; wordLen++) {
        const endRow = startRow + (wordLen - 1) * dRow;
        const endCol = startCol + (wordLen - 1) * dCol;
        if (!isValidPosition({ row: endRow, col: endCol })) break;

        // Check this word would pass through center
        let passesCenter = false;
        for (let i = 0; i < wordLen; i++) {
          if (startRow + i * dRow === CENTER_ROW && startCol + i * dCol === CENTER_COL) {
            passesCenter = true;
            break;
          }
        }
        if (!passesCenter) continue;

        // Build pattern (all '?' for first move)
        const pattern = '?'.repeat(wordLen);
        const matchingWords = findWordsMatchingPattern(pattern, rackLetters, dictionary);

        for (const word of matchingWords) {
          const candidate = tryPlaceWord(
            board, word, { row: startRow, col: startCol }, direction, rack, dictionary, true
          );
          if (candidate) {
            candidates.push(candidate);
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Removes duplicate moves (same word at same position).
 */
function deduplicateMoves(moves: CandidateMove[]): CandidateMove[] {
  const seen = new Set<string>();
  const unique: CandidateMove[] = [];

  for (const move of moves) {
    const key = move.tiles
      .map(t => `${t.position.row},${t.position.col}:${t.tile.letter}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(move);
    }
  }

  return unique;
}

/**
 * Selects a move based on AI difficulty.
 */
function selectMoveByDifficulty(
  candidates: CandidateMove[],
  difficulty: AIDifficulty
): CandidateMove {
  if (candidates.length === 0) {
    return { tiles: [], score: 0, words: [] };
  }

  switch (difficulty) {
    case 'EASY': {
      // Pick a random move from the bottom 50% of scoring moves
      // Also prefer shorter words (2-4 letters)
      const shortMoves = candidates.filter(m => {
        const totalLetters = m.words.join('').length;
        return totalLetters <= 16; // Roughly 2-4 letter words
      });
      const pool = shortMoves.length > 0 ? shortMoves : candidates;

      // Take from the lower-scoring half
      const lowerHalf = pool.slice(Math.floor(pool.length / 2));
      const selection = lowerHalf.length > 0 ? lowerHalf : pool;
      const idx = Math.floor(Math.random() * selection.length);
      return selection[idx];
    }

    case 'MEDIUM': {
      // Pick from the top 50% of moves, with some randomness
      const topHalf = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
      const idx = Math.floor(Math.random() * topHalf.length);
      return topHalf[idx];
    }

    case 'HARD': {
      // Always pick the highest scoring move
      return candidates[0];
    }

    default:
      return candidates[0];
  }
}
