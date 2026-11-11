'use client';

import React from 'react';
import { useGameStore } from '@/src/store/gameStore';

export default function ScoreBoard() {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const message = useGameStore((state) => state.message);

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-900/90 border-2 border-slate-700/80 rounded-xl p-4 shadow-xl">
      {/* Score header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <span className="font-bold text-sm uppercase tracking-wider text-slate-300">
          Leaderboard
        </span>
        <span className="text-xs text-amber-400 font-mono">2 Players</span>
      </div>

      {/* Players List */}
      <div className="flex flex-col gap-2">
        {players.map((player, idx) => {
          const isCurrent = idx === currentPlayerIndex;

          return (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-2.5 rounded-lg border transition-all
                ${
                  isCurrent
                    ? 'bg-amber-950/40 border-amber-500/70 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isCurrent ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-bold ${
                      isCurrent ? 'text-amber-300' : 'text-slate-300'
                    }`}
                  >
                    {player.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {player.isAI ? `Bot (${player.difficulty})` : 'Player'} • {player.rack.length} tiles
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-mono text-xl font-black text-amber-400">
                  {player.score}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                  points
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live System Announcement */}
      {message && (
        <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200">
          <p className="font-medium text-center">{message}</p>
        </div>
      )}

      {/* Move History Log */}
      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
          Recent Words
        </span>
        <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1 text-xs">
          {moveHistory.length === 0 ? (
            <span className="text-slate-500 text-[11px] italic py-2 text-center">
              No words placed yet. First move must cross the center star (★).
            </span>
          ) : (
            [...moveHistory].reverse().slice(0, 6).map((move, i) => {
              const playerName = players[move.playerIndex]?.name || 'Player';
              const wordsStr = move.words.length > 0 ? move.words.join(', ') : 'Passed';

              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800/80 text-[11px]"
                >
                  <div className="flex flex-col truncate max-w-[130px]">
                    <span className="font-semibold text-slate-200 uppercase tracking-wide truncate">
                      {wordsStr}
                    </span>
                    <span className="text-[9px] text-slate-500">{playerName}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 shrink-0">
                    +{move.score}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

