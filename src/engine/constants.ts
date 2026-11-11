// ============================================================================
// Scrabble Game Engine - Constants
// ============================================================================

import { PremiumType, TimerPreset } from './types';

/** Standard Scrabble board size */
export const BOARD_SIZE = 15;

/** Bonus points for using all 7 tiles in a single move */
export const BINGO_BONUS = 50;

/** Maximum tiles in a player's rack */
export const RACK_SIZE = 7;

/** Center position of the board */
export const CENTER_ROW = 7;
export const CENTER_COL = 7;

/**
 * Tile distribution: letter -> { count, points }
 * Standard English Scrabble distribution (100 tiles total)
 */
export const TILE_DISTRIBUTION: Record<string, { count: number; points: number }> = {
  A: { count: 9, points: 1 },
  B: { count: 2, points: 3 },
  C: { count: 2, points: 3 },
  D: { count: 4, points: 2 },
  E: { count: 12, points: 1 },
  F: { count: 2, points: 4 },
  G: { count: 3, points: 2 },
  H: { count: 2, points: 4 },
  I: { count: 9, points: 1 },
  J: { count: 1, points: 8 },
  K: { count: 1, points: 5 },
  L: { count: 4, points: 1 },
  M: { count: 2, points: 3 },
  N: { count: 6, points: 1 },
  O: { count: 8, points: 1 },
  P: { count: 2, points: 3 },
  Q: { count: 1, points: 10 },
  R: { count: 6, points: 1 },
  S: { count: 4, points: 1 },
  T: { count: 6, points: 1 },
  U: { count: 4, points: 1 },
  V: { count: 2, points: 4 },
  W: { count: 2, points: 4 },
  X: { count: 1, points: 8 },
  Y: { count: 2, points: 4 },
  Z: { count: 1, points: 10 },
  BLANK: { count: 2, points: 0 },
};

/**
 * Letter point values for quick lookup
 */
export const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

/**
 * Timer presets: per-turn time limit in seconds
 */
export const TIMER_PER_TURN: Record<TimerPreset, number> = {
  ONE_MINUTE: 60,
  BLITZ: 60,
  RAPID: 180,
  STANDARD: 300,
  RELAXED: 600,
};

/**
 * Timer presets: total game clock in seconds (0 = no limit)
 */
export const TIMER_GAME_TOTAL: Record<TimerPreset, number> = {
  ONE_MINUTE: 60,      // 1 minute total game time
  BLITZ: 15 * 60,      // 15 minutes
  RAPID: 25 * 60,      // 25 minutes
  STANDARD: 45 * 60,   // 45 minutes
  RELAXED: 0,          // No limit
};

/**
 * Premium square positions on the standard Scrabble board.
 * Key format: "row,col" → PremiumType
 */
export const PREMIUM_SQUARES: Record<string, PremiumType> = (() => {
  const map: Record<string, PremiumType> = {};

  // Helper to set symmetric positions (all 4 quadrant reflections)
  const setSymmetric = (row: number, col: number, type: PremiumType) => {
    const positions = [
      [row, col],
      [row, 14 - col],
      [14 - row, col],
      [14 - row, 14 - col],
    ];
    for (const [r, c] of positions) {
      map[`${r},${c}`] = type;
    }
  };

  // Triple Word Score (TW) — corners and mid-edges
  setSymmetric(0, 0, 'TW');
  setSymmetric(0, 7, 'TW');
  setSymmetric(7, 0, 'TW');

  // Double Word Score (DW) — diagonal and edge positions
  setSymmetric(1, 1, 'DW');
  setSymmetric(2, 2, 'DW');
  setSymmetric(3, 3, 'DW');
  setSymmetric(4, 4, 'DW');

  // Double Letter Score (DL)
  setSymmetric(0, 3, 'DL');
  setSymmetric(2, 6, 'DL');
  setSymmetric(3, 0, 'DL');
  setSymmetric(3, 7, 'DL');
  setSymmetric(6, 2, 'DL');
  setSymmetric(6, 6, 'DL');
  setSymmetric(7, 3, 'DL');

  // Triple Letter Score (TL)
  setSymmetric(1, 5, 'TL');
  setSymmetric(5, 1, 'TL');
  setSymmetric(5, 5, 'TL');

  // Center square
  map['7,7'] = 'CENTER';

  return map;
})();

/**
 * Get the premium type for a given board position.
 */
export function getPremiumType(row: number, col: number): PremiumType {
  return PREMIUM_SQUARES[`${row},${col}`] || 'NONE';
}
