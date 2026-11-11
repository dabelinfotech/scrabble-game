// ============================================================================
// Scrabble Game Engine - Board Management
// ============================================================================

import { CellState, Tile, Position, PlacedTile, AdjacentInfo } from './types';
import { BOARD_SIZE, getPremiumType } from './constants';

/**
 * Creates an empty 15x15 Scrabble board with premium squares assigned.
 */
export function createEmptyBoard(): CellState[][] {
  const board: CellState[][] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: CellState[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      rowCells.push({
        tile: null,
        premium: getPremiumType(row, col),
      });
    }
    board.push(rowCells);
  }
  return board;
}

/**
 * Returns a deep clone of the board.
 */
export function cloneBoard(board: CellState[][]): CellState[][] {
  return board.map(row =>
    row.map(cell => ({
      tile: cell.tile ? { ...cell.tile } : null,
      premium: cell.premium,
    }))
  );
}

/**
 * Places tiles on the board and returns a new board (immutable).
 * Does NOT validate the move — use moveValidator for that.
 */
export function placeTiles(board: CellState[][], tiles: PlacedTile[]): CellState[][] {
  const newBoard = cloneBoard(board);
  for (const { tile, position } of tiles) {
    const { row, col } = position;
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      newBoard[row][col] = {
        ...newBoard[row][col],
        tile: { ...tile },
      };
    }
  }
  return newBoard;
}

/**
 * Removes tiles from given positions and returns a new board (immutable).
 */
export function removeTiles(board: CellState[][], positions: Position[]): CellState[][] {
  const newBoard = cloneBoard(board);
  for (const { row, col } of positions) {
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      newBoard[row][col] = {
        ...newBoard[row][col],
        tile: null,
      };
    }
  }
  return newBoard;
}

/**
 * Gets the tile at a specific position, or null if empty.
 */
export function getTileAt(board: CellState[][], pos: Position): Tile | null {
  const { row, col } = pos;
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }
  return board[row][col].tile;
}

/**
 * Gets information about tiles adjacent to a given position.
 */
export function getAdjacentTiles(board: CellState[][], pos: Position): AdjacentInfo {
  const above = getTileAt(board, { row: pos.row - 1, col: pos.col });
  const below = getTileAt(board, { row: pos.row + 1, col: pos.col });
  const left = getTileAt(board, { row: pos.row, col: pos.col - 1 });
  const right = getTileAt(board, { row: pos.row, col: pos.col + 1 });

  return {
    above,
    below,
    left,
    right,
    hasAdjacent: above !== null || below !== null || left !== null || right !== null,
  };
}

/**
 * Checks if a position is occupied by a tile.
 */
export function isPositionOccupied(board: CellState[][], pos: Position): boolean {
  return getTileAt(board, pos) !== null;
}

/**
 * Checks if the entire board is empty (no tiles placed).
 */
export function isBoardEmpty(board: CellState[][]): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col].tile !== null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Returns all positions on the board that have tiles.
 */
export function getOccupiedPositions(board: CellState[][]): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col].tile !== null) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

/**
 * Checks if a position is within board bounds.
 */
export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

/**
 * Gets the premium type of a cell at a given position.
 */
export function getCellPremium(board: CellState[][], pos: Position): string {
  if (!isValidPosition(pos)) return 'NONE';
  return board[pos.row][pos.col].premium;
}
