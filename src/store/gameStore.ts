'use client';

import { create } from 'zustand';
import {
  Tile,
  Position,
  PlacedTile,
  CellState,
  PlayerState,
  MoveRecord,
  GamePhase,
  GameConfig,
  TimerPreset,
  PremiumType,
  Direction,
  ScoredWord,
  AIDifficulty,
} from '@/src/engine/types';
import {
  BOARD_SIZE,
  TILE_DISTRIBUTION,
  RACK_SIZE,
  TIMER_PER_TURN,
  TIMER_GAME_TOTAL,
  PREMIUM_SQUARES,
  BINGO_BONUS,
  LETTER_VALUES,
  getPremiumType,
  CENTER_ROW,
  CENTER_COL,
} from '@/src/engine/constants';

// ─── Inline Engine Helpers ───────────────────────────────────────────────────
// These are self-contained so the UI works even without the engine modules.

function createEmptyBoard(): CellState[][] {
  const board: CellState[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({ tile: null, premium: getPremiumType(r, c) });
    }
    board.push(row);
  }
  return board;
}

function createTileBag(): Tile[] {
  const bag: Tile[] = [];
  let idCounter = 0;
  for (const [letter, info] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < info.count; i++) {
      bag.push({
        letter: letter === 'BLANK' ? '' : letter,
        points: info.points,
        isBlank: letter === 'BLANK',
        id: `tile-${idCounter++}`,
      });
    }
  }
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, Math.min(count, bag.length));
  const remaining = bag.slice(drawn.length);
  return { drawn, remaining };
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getLetterPoints(letter: string): number {
  return LETTER_VALUES[letter.toUpperCase()] ?? 0;
}

// ─── Move Validation ─────────────────────────────────────────────────────────

function validateAndScoreMove(
  board: CellState[][],
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): { valid: boolean; score: number; words: ScoredWord[]; error?: string } {
  if (placedTiles.length === 0) {
    return { valid: false, score: 0, words: [], error: 'No tiles placed' };
  }

  // Check all tiles are on empty cells
  for (const pt of placedTiles) {
    if (board[pt.position.row][pt.position.col].tile !== null) {
      return { valid: false, score: 0, words: [], error: 'Cell already occupied' };
    }
  }

  // Check all tiles in same row or column
  const rows = new Set(placedTiles.map((pt) => pt.position.row));
  const cols = new Set(placedTiles.map((pt) => pt.position.col));
  const sameRow = rows.size === 1;
  const sameCol = cols.size === 1;

  if (!sameRow && !sameCol) {
    return { valid: false, score: 0, words: [], error: 'Tiles must be in a straight line' };
  }

  // Build a temporary board with the placed tiles
  const tempBoard: CellState[][] = board.map((row) =>
    row.map((cell) => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null }))
  );
  for (const pt of placedTiles) {
    tempBoard[pt.position.row][pt.position.col] = {
      ...tempBoard[pt.position.row][pt.position.col],
      tile: pt.tile,
    };
  }

  // Check first move goes through center
  if (isFirstMove) {
    const coversCenter = placedTiles.some(
      (pt) => pt.position.row === CENTER_ROW && pt.position.col === CENTER_COL
    );
    if (!coversCenter) {
      return { valid: false, score: 0, words: [], error: 'First move must cover the center square' };
    }
  }

  // Determine direction
  const direction: Direction = sameRow ? 'HORIZONTAL' : 'VERTICAL';

  // Check contiguity (no gaps in the line including existing tiles)
  if (placedTiles.length > 1) {
    if (direction === 'HORIZONTAL') {
      const r = placedTiles[0].position.row;
      const minC = Math.min(...placedTiles.map((pt) => pt.position.col));
      const maxC = Math.max(...placedTiles.map((pt) => pt.position.col));
      for (let c = minC; c <= maxC; c++) {
        if (tempBoard[r][c].tile === null) {
          return { valid: false, score: 0, words: [], error: 'Tiles must be contiguous' };
        }
      }
    } else {
      const c = placedTiles[0].position.col;
      const minR = Math.min(...placedTiles.map((pt) => pt.position.row));
      const maxR = Math.max(...placedTiles.map((pt) => pt.position.row));
      for (let r = minR; r <= maxR; r++) {
        if (tempBoard[r][c].tile === null) {
          return { valid: false, score: 0, words: [], error: 'Tiles must be contiguous' };
        }
      }
    }
  }

  // After first move, at least one tile must be adjacent to an existing tile
  if (!isFirstMove) {
    const placedPositions = new Set(placedTiles.map((pt) => `${pt.position.row},${pt.position.col}`));
    let hasAdjacentToExisting = false;
    for (const pt of placedTiles) {
      const { row, col } = pt.position;
      const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (
          nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
          board[nr][nc].tile !== null &&
          !placedPositions.has(`${nr},${nc}`)
        ) {
          hasAdjacentToExisting = true;
          break;
        }
      }
      if (hasAdjacentToExisting) break;
    }
    if (!hasAdjacentToExisting) {
      return { valid: false, score: 0, words: [], error: 'Must connect to existing tiles' };
    }
  }

  // Find all words formed
  const placedPositions = new Set(placedTiles.map((pt) => `${pt.position.row},${pt.position.col}`));
  const allWords: ScoredWord[] = [];

  const extractWord = (startRow: number, startCol: number, dir: Direction): ScoredWord | null => {
    const positions: Position[] = [];
    let r = startRow;
    let c = startCol;
    // Rewind to the beginning of the word
    if (dir === 'HORIZONTAL') {
      while (c > 0 && tempBoard[r][c - 1].tile !== null) c--;
    } else {
      while (r > 0 && tempBoard[r - 1][c].tile !== null) r--;
    }
    // Read forward
    let word = '';
    let score = 0;
    let wordMultiplier = 1;
    while (
      r < BOARD_SIZE &&
      c < BOARD_SIZE &&
      tempBoard[r][c].tile !== null
    ) {
      const cell = tempBoard[r][c];
      const tile = cell.tile!;
      let letterScore = tile.isBlank ? 0 : tile.points;
      const posKey = `${r},${c}`;
      // Premium applies only if the tile was just placed
      if (placedPositions.has(posKey)) {
        const premium = cell.premium;
        if (premium === 'DL') letterScore *= 2;
        else if (premium === 'TL') letterScore *= 3;
        else if (premium === 'DW' || premium === 'CENTER') wordMultiplier *= 2;
        else if (premium === 'TW') wordMultiplier *= 3;
      }
      score += letterScore;
      word += tile.letter;
      positions.push({ row: r, col: c });
      if (dir === 'HORIZONTAL') c++;
      else r++;
    }
    if (word.length < 2) return null;
    return { word, score: score * wordMultiplier, positions };
  };

  // Main word (along the direction of placement)
  const mainWord = extractWord(
    placedTiles[0].position.row,
    placedTiles[0].position.col,
    direction
  );
  if (mainWord) allWords.push(mainWord);

  // Cross words (perpendicular for each placed tile)
  const crossDir: Direction = direction === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL';
  for (const pt of placedTiles) {
    const crossWord = extractWord(pt.position.row, pt.position.col, crossDir);
    if (crossWord) allWords.push(crossWord);
  }

  if (allWords.length === 0) {
    return { valid: false, score: 0, words: [], error: 'No valid words formed' };
  }

  let totalScore = allWords.reduce((sum, w) => sum + w.score, 0);

  // Bingo bonus for using all 7 tiles
  if (placedTiles.length === RACK_SIZE) {
    totalScore += BINGO_BONUS;
  }

  return { valid: true, score: totalScore, words: allWords };
}

// ─── Simple AI ───────────────────────────────────────────────────────────────

function generateAIMove(
  board: CellState[][],
  rack: Tile[],
  _difficulty: AIDifficulty,
  isFirstMove: boolean
): PlacedTile[] | null {
  // Simple AI: tries to place tiles in valid positions
  // Tries each position and direction, placing 1-3 tiles
  const directions: Direction[] = ['HORIZONTAL', 'VERTICAL'];

  // First move — try to place 2-3 tiles through center
  if (isFirstMove) {
    for (let len = Math.min(3, rack.length); len >= 2; len--) {
      // Horizontal through center
      const startCol = CENTER_COL - Math.floor(len / 2);
      const tiles: PlacedTile[] = [];
      for (let i = 0; i < len; i++) {
        tiles.push({
          tile: rack[i],
          position: { row: CENTER_ROW, col: startCol + i },
        });
      }
      const result = validateAndScoreMove(board, tiles, true);
      if (result.valid) return tiles;
    }
    // Fallback: place 2 tiles vertically through center
    if (rack.length >= 2) {
      return [
        { tile: rack[0], position: { row: CENTER_ROW, col: CENTER_COL } },
        { tile: rack[1], position: { row: CENTER_ROW + 1, col: CENTER_COL } },
      ];
    }
    return null;
  }

  // Find all existing tiles on the board to build off of
  const occupiedPositions: Position[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].tile !== null) {
        occupiedPositions.push({ row: r, col: c });
      }
    }
  }

  // Try to place 1-2 tiles adjacent to existing tiles
  for (const occupied of shuffleArray(occupiedPositions)) {
    for (const dir of directions) {
      for (let len = Math.min(2, rack.length); len >= 1; len--) {
        const tiles: PlacedTile[] = [];
        let valid = true;
        for (let i = 0; i < len; i++) {
          const r = dir === 'VERTICAL' ? occupied.row + 1 + i : occupied.row;
          const c = dir === 'HORIZONTAL' ? occupied.col + 1 + i : occupied.col;
          if (r >= BOARD_SIZE || c >= BOARD_SIZE || board[r][c].tile !== null) {
            valid = false;
            break;
          }
          tiles.push({ tile: rack[i], position: { row: r, col: c } });
        }
        if (!valid || tiles.length === 0) continue;

        const result = validateAndScoreMove(board, tiles, false);
        if (result.valid) return tiles;
      }
      // Also try placing before
      for (let len = Math.min(2, rack.length); len >= 1; len--) {
        const tiles: PlacedTile[] = [];
        let valid = true;
        for (let i = 0; i < len; i++) {
          const r = dir === 'VERTICAL' ? occupied.row - 1 - i : occupied.row;
          const c = dir === 'HORIZONTAL' ? occupied.col - 1 - i : occupied.col;
          if (r < 0 || c < 0 || board[r][c].tile !== null) {
            valid = false;
            break;
          }
          tiles.push({ tile: rack[i], position: { row: r, col: c } });
        }
        if (!valid || tiles.length === 0) continue;
        // Reverse tiles so they're in order
        tiles.reverse();
        const result = validateAndScoreMove(board, tiles, false);
        if (result.valid) return tiles;
      }
    }
  }

  return null; // No valid move found — AI will skip
}

// ─── Store Types ─────────────────────────────────────────────────────────────

interface GameStore {
  // State
  board: CellState[][];
  players: PlayerState[];
  currentPlayerIndex: number;
  tileBag: Tile[];
  phase: GamePhase;
  selectedTile: Tile | null;
  placedThisTurn: PlacedTile[];
  moveHistory: MoveRecord[];
  turnTimeRemaining: number;
  gameTimers: number[];
  timerPreset: TimerPreset;
  isTimerRunning: boolean;
  lastMoveScore: number | null;
  message: string;
  gameConfig: GameConfig;
  showBlankPicker: boolean;
  pendingBlankPosition: Position | null;
  turnNumber: number;
  consecutiveSkips: number;

  // Actions
  initGame: (config: GameConfig) => void;
  selectTile: (tile: Tile | null) => void;
  placeTile: (position: Position) => void;
  removePlacedTile: (position: Position) => void;
  submitMove: () => void;
  skipTurn: () => void;
  exchangeTiles: (tiles: Tile[]) => void;
  shuffleRack: () => void;
  recallTiles: () => void;
  tickTimer: () => void;
  tickGameTimer: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  executeAIMove: () => void;
  setBlankLetter: (letter: string) => void;
  resetGame: () => void;
  setPhase: (phase: GamePhase) => void;
  setMessage: (message: string) => void;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  board: [],
  players: [],
  currentPlayerIndex: 0,
  tileBag: [],
  phase: 'WAITING' as GamePhase,
  selectedTile: null,
  placedThisTurn: [],
  moveHistory: [],
  turnTimeRemaining: 60,
  gameTimers: [60, 60],
  timerPreset: 'ONE_MINUTE' as TimerPreset,
  isTimerRunning: false,
  lastMoveScore: null,
  message: '',
  gameConfig: {
    timerPreset: 'ONE_MINUTE' as TimerPreset,
    dictionary: 'SOWPODS' as const,
    playerCount: 2,
    aiDifficulty: 'MEDIUM' as AIDifficulty,
  },
  showBlankPicker: false,
  pendingBlankPosition: null,
  turnNumber: 1,
  consecutiveSkips: 0,

  // ── Actions ──────────────────────────────────────────────────────────

  initGame: (config: GameConfig) => {
    const board = createEmptyBoard();
    let bag = createTileBag();

    const players: PlayerState[] = [];
    for (let i = 0; i < config.playerCount; i++) {
      const { drawn, remaining } = drawTiles(bag, RACK_SIZE);
      bag = remaining;
      players.push({
        id: `player-${i}`,
        name: i === 0 ? 'You' : config.playerCount === 2 && i === 1 ? 'Opponent' : `Player ${i + 1}`,
        rack: drawn,
        score: 0,
        isAI: i > 0 && config.playerCount === 2, // In 2-player single-player, player 2 is AI
        difficulty: config.aiDifficulty,
        timerRemaining: TIMER_GAME_TOTAL[config.timerPreset] ?? 60,
      });
    }

    const turnTime = TIMER_PER_TURN[config.timerPreset] ?? 60;
    const gameTimers = players.map(
      () => TIMER_GAME_TOTAL[config.timerPreset] ?? 60
    );

    set({
      board,
      players,
      currentPlayerIndex: 0,
      tileBag: bag,
      phase: 'PLAYING',
      selectedTile: null,
      placedThisTurn: [],
      moveHistory: [],
      turnTimeRemaining: turnTime,
      gameTimers,
      timerPreset: config.timerPreset,
      isTimerRunning: true,
      lastMoveScore: null,
      message: 'Your turn! Place tiles on the board.',
      gameConfig: config,
      showBlankPicker: false,
      pendingBlankPosition: null,
      turnNumber: 1,
      consecutiveSkips: 0,
    });
  },

  selectTile: (tile: Tile | null) => {
    const { selectedTile } = get();
    if (tile && selectedTile && tile.id === selectedTile.id) {
      set({ selectedTile: null });
    } else {
      set({ selectedTile: tile });
    }
  },

  placeTile: (position: Position) => {
    const { selectedTile, board, placedThisTurn, players, currentPlayerIndex } = get();
    if (!selectedTile) return;

    const { row, col } = position;
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;

    // Check if cell is already occupied (by a committed tile)
    if (board[row][col].tile !== null) return;

    // Check if a tile placed this turn is already there
    if (placedThisTurn.some((pt) => pt.position.row === row && pt.position.col === col)) return;

    // If it's a blank tile without an assigned letter, show the blank picker
    if (selectedTile.isBlank && selectedTile.letter === '') {
      set({ pendingBlankPosition: position, showBlankPicker: true });
      return;
    }

    // Remove the tile from the rack
    const player = players[currentPlayerIndex];
    const tileIndex = player.rack.findIndex((t) => t.id === selectedTile.id);
    if (tileIndex === -1) return;

    const newRack = [...player.rack];
    newRack.splice(tileIndex, 1);

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, rack: newRack };

    set({
      placedThisTurn: [...placedThisTurn, { tile: selectedTile, position }],
      players: newPlayers,
      selectedTile: null,
    });
  },

  removePlacedTile: (position: Position) => {
    const { placedThisTurn, players, currentPlayerIndex } = get();
    const index = placedThisTurn.findIndex(
      (pt) => pt.position.row === position.row && pt.position.col === position.col
    );
    if (index === -1) return;

    const removed = placedThisTurn[index];
    const newPlaced = [...placedThisTurn];
    newPlaced.splice(index, 1);

    const player = players[currentPlayerIndex];
    const newRack = [...player.rack, removed.tile];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, rack: newRack };

    set({
      placedThisTurn: newPlaced,
      players: newPlayers,
      selectedTile: null,
    });
  },

  submitMove: () => {
    const { board, placedThisTurn, players, currentPlayerIndex, tileBag, moveHistory, turnNumber, timerPreset } = get();
    if (placedThisTurn.length === 0) {
      set({ message: 'Place at least one tile before submitting.' });
      return;
    }

    const isFirstMove = moveHistory.length === 0;
    const result = validateAndScoreMove(board, placedThisTurn, isFirstMove);

    if (!result.valid) {
      set({ message: result.error || 'Invalid move!' });
      return;
    }

    // Commit tiles to the board
    const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    for (const pt of placedThisTurn) {
      newBoard[pt.position.row][pt.position.col] = {
        ...newBoard[pt.position.row][pt.position.col],
        tile: pt.tile,
      };
    }

    // Update score
    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };
    player.score += result.score;

    // Draw replacement tiles
    const tilesToDraw = placedThisTurn.length;
    const { drawn, remaining } = drawTiles(tileBag, tilesToDraw);
    player.rack = [...player.rack, ...drawn];
    newPlayers[currentPlayerIndex] = player;

    // Record the move
    const moveRecord: MoveRecord = {
      playerIndex: currentPlayerIndex,
      tiles: placedThisTurn,
      score: result.score,
      words: result.words.map((w) => w.word),
      timestamp: Date.now(),
    };

    // Check if game is over
    const bagEmpty = remaining.length === 0;
    const playerEmpty = player.rack.length === 0;
    const gameOver = bagEmpty && playerEmpty;

    const nextPlayerIndex = gameOver ? currentPlayerIndex : (currentPlayerIndex + 1) % newPlayers.length;
    const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;

    set({
      board: newBoard,
      players: newPlayers,
      tileBag: remaining,
      currentPlayerIndex: nextPlayerIndex,
      placedThisTurn: [],
      selectedTile: null,
      moveHistory: [...moveHistory, moveRecord],
      lastMoveScore: result.score,
      message: gameOver
        ? 'Game Over!'
        : `${player.name} scored ${result.score} points! (${result.words.map((w) => w.word).join(', ')})`,
      phase: gameOver ? 'GAME_OVER' : 'PLAYING',
      turnTimeRemaining: TIMER_PER_TURN[timerPreset],
      turnNumber: newTurnNumber,
      consecutiveSkips: 0,
    });

    // If next player is AI and game isn't over, execute AI move after a delay
    if (!gameOver && newPlayers[nextPlayerIndex].isAI) {
      setTimeout(() => get().executeAIMove(), 1200);
    }
  },

  skipTurn: () => {
    const { players, currentPlayerIndex, timerPreset, moveHistory, turnNumber, consecutiveSkips } = get();
    const player = players[currentPlayerIndex];
    const newConsecutiveSkips = consecutiveSkips + 1;

    // Record skip
    const moveRecord: MoveRecord = {
      playerIndex: currentPlayerIndex,
      tiles: [],
      score: 0,
      words: [],
      timestamp: Date.now(),
    };

    // Game over if too many consecutive skips (all players skip twice)
    const gameOver = newConsecutiveSkips >= players.length * 2;
    const nextPlayerIndex = gameOver
      ? currentPlayerIndex
      : (currentPlayerIndex + 1) % players.length;
    const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;

    // Recall any placed tiles first
    get().recallTiles();

    set({
      currentPlayerIndex: nextPlayerIndex,
      placedThisTurn: [],
      selectedTile: null,
      moveHistory: [...moveHistory, moveRecord],
      lastMoveScore: null,
      message: gameOver
        ? 'Game Over! Too many consecutive skips.'
        : `${player.name} skipped their turn.`,
      turnTimeRemaining: TIMER_PER_TURN[timerPreset],
      phase: gameOver ? 'GAME_OVER' : 'PLAYING',
      turnNumber: newTurnNumber,
      consecutiveSkips: newConsecutiveSkips,
    });

    if (!gameOver && players[nextPlayerIndex].isAI) {
      setTimeout(() => get().executeAIMove(), 1200);
    }
  },

  exchangeTiles: (tiles: Tile[]) => {
    const { players, currentPlayerIndex, tileBag, timerPreset, moveHistory, turnNumber } = get();
    if (tileBag.length < tiles.length) {
      set({ message: 'Not enough tiles in the bag to exchange.' });
      return;
    }

    const player = { ...players[currentPlayerIndex] };
    const tileIds = new Set(tiles.map((t) => t.id));

    // Remove tiles from rack
    const remainingRack = player.rack.filter((t) => !tileIds.has(t.id));

    // Draw new tiles
    const { drawn, remaining: bagAfterDraw } = drawTiles(tileBag, tiles.length);
    player.rack = [...remainingRack, ...drawn];

    // Return exchanged tiles to bag and reshuffle
    const newBag = shuffleArray([...bagAfterDraw, ...tiles]);

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = player;

    const nextPlayerIndex = (currentPlayerIndex + 1) % newPlayers.length;
    const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;

    const moveRecord: MoveRecord = {
      playerIndex: currentPlayerIndex,
      tiles: [],
      score: 0,
      words: ['(exchanged)'],
      timestamp: Date.now(),
    };

    set({
      players: newPlayers,
      tileBag: newBag,
      currentPlayerIndex: nextPlayerIndex,
      placedThisTurn: [],
      selectedTile: null,
      moveHistory: [...moveHistory, moveRecord],
      lastMoveScore: null,
      message: `${player.name} exchanged ${tiles.length} tile(s).`,
      turnTimeRemaining: TIMER_PER_TURN[timerPreset],
      turnNumber: newTurnNumber,
      consecutiveSkips: 0,
    });

    if (newPlayers[nextPlayerIndex].isAI) {
      setTimeout(() => get().executeAIMove(), 1200);
    }
  },

  shuffleRack: () => {
    const { players, currentPlayerIndex } = get();
    const player = { ...players[currentPlayerIndex] };
    player.rack = shuffleArray(player.rack);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = player;
    set({ players: newPlayers });
  },

  recallTiles: () => {
    const { placedThisTurn, players, currentPlayerIndex } = get();
    if (placedThisTurn.length === 0) return;

    const player = { ...players[currentPlayerIndex] };
    player.rack = [...player.rack, ...placedThisTurn.map((pt) => pt.tile)];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = player;

    set({
      placedThisTurn: [],
      players: newPlayers,
      selectedTile: null,
    });
  },

  tickTimer: () => {
    const { turnTimeRemaining, isTimerRunning, phase } = get();
    if (!isTimerRunning || phase !== 'PLAYING') return;

    if (turnTimeRemaining <= 1) {
      // Time's up — auto-skip
      set({ message: 'Time\'s up! Turn skipped.' });
      get().recallTiles();
      get().skipTurn();
      return;
    }

    set({ turnTimeRemaining: turnTimeRemaining - 1 });
  },

  tickGameTimer: () => {
    const { gameTimers, currentPlayerIndex, isTimerRunning, phase, timerPreset } = get();
    if (!isTimerRunning || phase !== 'PLAYING') return;
    if (TIMER_GAME_TOTAL[timerPreset] === 0) return; // Relaxed mode — no game timer

    const newTimers = [...gameTimers];
    newTimers[currentPlayerIndex] = Math.max(0, newTimers[currentPlayerIndex] - 1);

    if (newTimers[currentPlayerIndex] <= 0) {
      // Player ran out of total time — game over
      set({
        gameTimers: newTimers,
        phase: 'GAME_OVER',
        message: `Time's up! ${get().players[currentPlayerIndex].name} ran out of time.`,
        isTimerRunning: false,
      });
      return;
    }

    set({ gameTimers: newTimers });
  },

  startTimer: () => set({ isTimerRunning: true }),
  pauseTimer: () => set({ isTimerRunning: false }),

  executeAIMove: () => {
    const { board, players, currentPlayerIndex, tileBag, moveHistory, timerPreset, turnNumber } = get();
    const player = players[currentPlayerIndex];
    if (!player.isAI) return;

    const isFirstMove = moveHistory.length === 0;
    const aiMove = generateAIMove(
      board,
      player.rack,
      player.difficulty || 'MEDIUM',
      isFirstMove
    );

    if (!aiMove || aiMove.length === 0) {
      // AI skips
      set({ message: `${player.name} couldn't find a move and skipped.` });
      get().skipTurn();
      return;
    }

    // Validate and score
    const result = validateAndScoreMove(board, aiMove, isFirstMove);
    if (!result.valid) {
      // AI made an invalid move — skip instead
      set({ message: `${player.name} skipped.` });
      get().skipTurn();
      return;
    }

    // Commit AI tiles to board
    const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    for (const pt of aiMove) {
      newBoard[pt.position.row][pt.position.col] = {
        ...newBoard[pt.position.row][pt.position.col],
        tile: pt.tile,
      };
    }

    // Update AI player
    const newPlayers = [...players];
    const aiPlayer = { ...newPlayers[currentPlayerIndex] };
    aiPlayer.score += result.score;

    // Remove placed tiles from rack
    const placedIds = new Set(aiMove.map((pt) => pt.tile.id));
    aiPlayer.rack = aiPlayer.rack.filter((t) => !placedIds.has(t.id));

    // Draw replacement tiles
    const { drawn, remaining } = drawTiles(tileBag, aiMove.length);
    aiPlayer.rack = [...aiPlayer.rack, ...drawn];
    newPlayers[currentPlayerIndex] = aiPlayer;

    const moveRecord: MoveRecord = {
      playerIndex: currentPlayerIndex,
      tiles: aiMove,
      score: result.score,
      words: result.words.map((w) => w.word),
      timestamp: Date.now(),
    };

    const bagEmpty = remaining.length === 0;
    const playerEmpty = aiPlayer.rack.length === 0;
    const gameOver = bagEmpty && playerEmpty;

    const nextPlayerIndex = gameOver ? currentPlayerIndex : (currentPlayerIndex + 1) % newPlayers.length;
    const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;

    set({
      board: newBoard,
      players: newPlayers,
      tileBag: remaining,
      currentPlayerIndex: nextPlayerIndex,
      placedThisTurn: [],
      selectedTile: null,
      moveHistory: [...moveHistory, moveRecord],
      lastMoveScore: result.score,
      message: gameOver
        ? 'Game Over!'
        : `${aiPlayer.name} played "${result.words.map((w) => w.word).join(', ')}" for ${result.score} points!`,
      phase: gameOver ? 'GAME_OVER' : 'PLAYING',
      turnTimeRemaining: TIMER_PER_TURN[timerPreset],
      turnNumber: newTurnNumber,
      consecutiveSkips: 0,
    });
  },

  setBlankLetter: (letter: string) => {
    const { selectedTile, pendingBlankPosition, players, currentPlayerIndex, placedThisTurn } = get();
    if (!selectedTile || !pendingBlankPosition) return;

    // Create a new tile with the chosen letter but 0 points
    const blankTile: Tile = {
      ...selectedTile,
      letter: letter.toUpperCase(),
      points: 0,
      isBlank: true,
    };

    // Remove the tile from the rack
    const player = players[currentPlayerIndex];
    const tileIndex = player.rack.findIndex((t) => t.id === selectedTile.id);
    if (tileIndex === -1) {
      set({ showBlankPicker: false, pendingBlankPosition: null });
      return;
    }

    const newRack = [...player.rack];
    newRack.splice(tileIndex, 1);

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, rack: newRack };

    set({
      placedThisTurn: [
        ...placedThisTurn,
        { tile: blankTile, position: pendingBlankPosition },
      ],
      players: newPlayers,
      selectedTile: null,
      showBlankPicker: false,
      pendingBlankPosition: null,
    });
  },

  resetGame: () => {
    set({
      board: [],
      players: [],
      currentPlayerIndex: 0,
      tileBag: [],
      phase: 'WAITING',
      selectedTile: null,
      placedThisTurn: [],
      moveHistory: [],
      turnTimeRemaining: 0,
      gameTimers: [],
      isTimerRunning: false,
      lastMoveScore: null,
      message: '',
      showBlankPicker: false,
      pendingBlankPosition: null,
      turnNumber: 1,
      consecutiveSkips: 0,
    });
  },

  setPhase: (phase: GamePhase) => set({ phase }),
  setMessage: (message: string) => set({ message }),
}));
