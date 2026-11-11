// ============================================================================
// Scrabble Game Engine - Tile Bag Management
// ============================================================================

import { Tile } from './types';
import { TILE_DISTRIBUTION } from './constants';

/**
 * Fisher-Yates shuffle algorithm. Returns a new shuffled array.
 */
export function shuffleBag(bag: Tile[]): Tile[] {
  const shuffled = [...bag];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates a full tile bag with all 100 standard Scrabble tiles, shuffled.
 * Each tile has a unique ID for tracking.
 */
export function createTileBag(): Tile[] {
  const tiles: Tile[] = [];
  let idCounter = 0;

  for (const [letter, { count, points }] of Object.entries(TILE_DISTRIBUTION)) {
    const isBlank = letter === 'BLANK';
    for (let i = 0; i < count; i++) {
      tiles.push({
        letter: isBlank ? '' : letter,
        points,
        isBlank,
        id: `tile_${idCounter++}`,
      });
    }
  }

  return shuffleBag(tiles);
}

/**
 * Draws tiles from the bag.
 * Returns the drawn tiles and the remaining bag.
 * If fewer tiles are available than requested, draws all remaining.
 */
export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const actualCount = Math.min(count, bag.length);
  const drawn = bag.slice(0, actualCount);
  const remaining = bag.slice(actualCount);
  return { drawn, remaining };
}

/**
 * Returns tiles to the bag and reshuffles.
 */
export function returnTiles(bag: Tile[], tiles: Tile[]): Tile[] {
  const newBag = [...bag, ...tiles];
  return shuffleBag(newBag);
}

/**
 * Gets the number of tiles remaining in the bag.
 */
export function getTilesRemaining(bag: Tile[]): number {
  return bag.length;
}

/**
 * Exchanges tiles: returns given tiles to bag, draws new ones.
 * The bag must have at least as many tiles as being exchanged.
 */
export function exchangeTiles(
  bag: Tile[],
  tilesToExchange: Tile[]
): { drawn: Tile[]; remaining: Tile[] } | null {
  if (bag.length < tilesToExchange.length) {
    return null; // Not enough tiles in bag to exchange
  }

  // First, draw new tiles
  const { drawn, remaining } = drawTiles(bag, tilesToExchange.length);

  // Then return the exchanged tiles to the remaining bag
  const newBag = returnTiles(remaining, tilesToExchange);

  return { drawn, remaining: newBag };
}
