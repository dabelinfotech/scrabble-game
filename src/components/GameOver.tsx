'use client';

import React from 'react';
import { useGameStore } from '@/src/store/gameStore';

interface GameOverProps {
  onBackToMenu: () => void;
}

export default function GameOver({ onBackToMenu }: GameOverProps) {
  const phase = useGameStore((state) => state.phase);
  const players = useGameStore((state) => state.players);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const resetGame = useGameStore((state) => state.resetGame);
  const initGame = useGameStore((state) => state.initGame);
  const gameConfig = useGameStore((state) => state.gameConfig);

  if (phase !== 'GAME_OVER') return null;

  // Determine winner
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;

  const handlePlayAgain = () => {
    initGame(gameConfig);
  };

  const handleReturnToMenu = () => {
    resetGame();
    onBackToMenu();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 md:p-8 max-w-md w-full flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <span className="text-5xl mb-2">🏆</span>
          <h2 className="text-3xl font-extrabold font-game text-amber-400 tracking-wide">
            {isTie ? "It's a Tie!" : `${winner.name} Wins!`}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Game completed after {moveHistory.length} moves
          </p>
        </div>

        {/* Final Scores */}
        <div className="w-full flex flex-col gap-2.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
            Final Standings
          </span>
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border ${
                idx === 0
                  ? 'bg-amber-950/40 border-amber-500/60'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg font-mono text-amber-400">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-slate-200 text-sm">
                  {player.name}
                </span>
              </div>
              <span className="font-mono text-xl font-black text-amber-300">
                {player.score} pts
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handlePlayAgain}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg transition-all"
          >
            Play Again
          </button>
          <button
            onClick={handleReturnToMenu}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            Main Menu
          </button>
        </div>

        <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-widest pt-1">
          Powered by DABELTECH
        </span>
      </div>
    </div>
  );
}

