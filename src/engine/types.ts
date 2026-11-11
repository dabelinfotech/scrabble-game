// ============================================================================
// Scrabble Game Engine - Type Definitions
// ============================================================================

/** A single tile in the game */
export interface Tile {
  /** The letter on the tile (uppercase, or empty string for blank) */
  letter: string;
  /** Point value of this tile */
  points: number;
  /** Whether this is a blank/wild tile */
  isBlank: boolean;
  /** Unique identifier for this tile instance */
  id: string;
}

/** A position on the board */
export interface Position {
  row: number;
  col: number;
}

/** A tile placed at a specific board position */
export interface PlacedTile {
  tile: Tile;
  position: Position;
}

/** Premium square type */
export type PremiumType = 'NONE' | 'DL' | 'TL' | 'DW' | 'TW' | 'CENTER';

/** The state of a single cell on the board */
export interface CellState {
  /** The tile occupying this cell, or null if empty */
  tile: Tile | null;
  /** The premium square type at this position */
  premium: PremiumType;
}

/** Direction of word placement */
export type Direction = 'HORIZONTAL' | 'VERTICAL';

/** A scored word with its constituent positions */
export interface ScoredWord {
  /** The word string */
  word: string;
  /** The score for this word */
  score: number;
  /** The positions of the letters forming this word */
  positions: Position[];
}

/** Result of validating and scoring a move */
export interface MoveResult {
  /** Whether the move is valid */
  valid: boolean;
  /** Total score for this move (0 if invalid) */
  score: number;
  /** All words formed by this move with their individual scores */
  words: ScoredWord[];
  /** Error message if the move is invalid */
  error?: string;
}

/** Game phase */
export type GamePhase = 'WAITING' | 'PLAYING' | 'GAME_OVER';

/** AI difficulty level */
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** Timer preset */
export type TimerPreset = 'ONE_MINUTE' | 'BLITZ' | 'RAPID' | 'STANDARD' | 'RELAXED';

/** State of a timer */
export interface TimerState {
  /** Remaining time in seconds */
  remaining: number;
  /** Total time allowed in seconds */
  total: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
}

/** State of a single player */
export interface PlayerState {
  /** Unique player identifier */
  id: string;
  /** Display name */
  name: string;
  /** Tiles currently in the player's rack */
  rack: Tile[];
  /** Current score */
  score: number;
  /** Whether this player is controlled by AI */
  isAI: boolean;
  /** AI difficulty (only relevant if isAI is true) */
  difficulty?: AIDifficulty;
  /** Remaining time for this player in seconds */
  timerRemaining: number;
}

/** Record of a single move */
export interface MoveRecord {
  /** Index of the player who made this move */
  playerIndex: number;
  /** Tiles that were placed */
  tiles: PlacedTile[];
  /** Total score earned for the move */
  score: number;
  /** Words formed by this move */
  words: string[];
  /** Timestamp when the move was made */
  timestamp: number;
}

/** Complete game state */
export interface GameState {
  /** The 15x15 game board */
  board: CellState[][];
  /** All players in the game */
  players: PlayerState[];
  /** Index of the player whose turn it is */
  currentPlayerIndex: number;
  /** Tiles remaining in the bag */
  tileBag: Tile[];
  /** Current game phase */
  phase: GamePhase;
  /** History of all moves made */
  moveHistory: MoveRecord[];
  /** Turn timer state */
  turnTimer: TimerState;
  /** Per-player game timer states */
  gameTimer: TimerState[];
}

/** Game configuration */
export interface GameConfig {
  /** Timer preset for the game */
  timerPreset: TimerPreset;
  /** Dictionary to use for word validation */
  dictionary: 'SOWPODS' | 'TWL';
  /** Number of players (2-4) */
  playerCount: number;
  /** AI difficulty for AI players */
  aiDifficulty: AIDifficulty;
}

/** Information about adjacent tiles around a position */
export interface AdjacentInfo {
  above: Tile | null;
  below: Tile | null;
  left: Tile | null;
  right: Tile | null;
  hasAdjacent: boolean;
}
