'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/src/store/gameStore';
import { TIMER_PER_TURN } from '@/src/engine/constants';

export default function Timer() {
  const turnTimeRemaining = useGameStore((state) => state.turnTimeRemaining);
  const gameTimers = useGameStore((state) => state.gameTimers);
  const isTimerRunning = useGameStore((state) => state.isTimerRunning);
  const timerPreset = useGameStore((state) => state.timerPreset);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const turnNumber = useGameStore((state) => state.turnNumber);
  const phase = useGameStore((state) => state.phase);

  const tickTimer = useGameStore((state) => state.tickTimer);
  const tickGameTimer = useGameStore((state) => state.tickGameTimer);

  // Set up timer ticking effect
  useEffect(() => {
    if (!isTimerRunning || phase !== 'PLAYING') return;

    const interval = setInterval(() => {
      tickTimer();
      tickGameTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, phase, tickTimer, tickGameTimer]);

  const totalTurnTime = TIMER_PER_TURN[timerPreset] || 300;
  const turnPercent = Math.max(0, Math.min(100, (turnTimeRemaining / totalTurnTime) * 100));

  // Determine urgency color
  const getUrgencyClass = () => {
    if (turnPercent > 50) return 'timer-safe';
    if (turnPercent > 20) return 'timer-warning';
    return 'timer-danger';
  };

  const getProgressBarColor = () => {
    if (turnPercent > 50) return 'bg-emerald-500';
    if (turnPercent > 20) return 'bg-amber-500';
    return 'bg-red-500 animate-pulse';
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(Math.max(0, sec) / 60);
    const secs = Math.max(0, sec) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-section w-full flex flex-col gap-4 bg-slate-900/90 border-2 border-slate-700/80 rounded-xl p-4 shadow-xl">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <span className="font-bold text-sm tracking-wider uppercase text-slate-300">
            Time Control
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono font-semibold border border-amber-500/30">
          {timerPreset === 'ONE_MINUTE' ? '1 MINUTE' : timerPreset}
        </span>
      </div>

      {/* Main Turn Countdown */}
      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950/70 border border-slate-800">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">
          Turn Timer
        </span>
        <div className={`timer-display font-mono text-4xl md:text-5xl font-black ${getUrgencyClass()}`}>
          {formatSeconds(turnTimeRemaining)}
        </div>

        {/* Turn Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${getProgressBarColor()}`}
            style={{ width: `${turnPercent}%` }}
          />
        </div>

        {turnTimeRemaining <= 15 && turnTimeRemaining > 0 && (
          <span className="text-[11px] text-red-400 font-semibold animate-pulse mt-1.5 flex items-center gap-1">
            ⚠️ Time Running Out!
          </span>
        )}
      </div>

      {/* Chess-style Game Clocks for Players */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Player Clocks
        </span>
        <div className="grid grid-cols-2 gap-2">
          {players.map((player, idx) => {
            const isCurrent = idx === currentPlayerIndex;
            const remaining = gameTimers[idx] ?? 0;

            return (
              <div
                key={player.id}
                className={`
                  p-2.5 rounded-lg border flex flex-col transition-all duration-200
                  ${
                    isCurrent
                      ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-950/40 border-slate-800 opacity-75'
                  }
                `}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span
                    className={`font-semibold truncate max-w-[80px] ${
                      isCurrent ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {player.name}
                  </span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <span
                  className={`font-mono text-lg font-bold ${
                    isCurrent ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {formatSeconds(remaining)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn Meta Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
        <span>Turn: <strong className="text-slate-200">#{turnNumber}</strong></span>
        <span>Status: <strong className="text-emerald-400">{phase}</strong></span>
      </div>
    </div>
  );
}

