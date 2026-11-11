'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues with Zustand
const MainMenu = dynamic(() => import('@/src/components/MainMenu'), { ssr: false });
const Board = dynamic(() => import('@/src/components/Board'), { ssr: false });
const TileRack = dynamic(() => import('@/src/components/TileRack'), { ssr: false });
const Timer = dynamic(() => import('@/src/components/Timer'), { ssr: false });
const ScoreBoard = dynamic(() => import('@/src/components/ScoreBoard'), { ssr: false });
const GameControls = dynamic(() => import('@/src/components/GameControls'), { ssr: false });
const GameOver = dynamic(() => import('@/src/components/GameOver'), { ssr: false });
const BlankTilePicker = dynamic(() => import('@/src/components/BlankTilePicker'), { ssr: false });

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <main className="min-h-screen flex flex-col justify-between">
      {!gameStarted ? (
        <MainMenu onStartGame={() => setGameStarted(true)} />
      ) : (
        <GameScreen onBackToMenu={() => setGameStarted(false)} />
      )}
    </main>
  );
}

function GameScreen({ onBackToMenu }: { onBackToMenu: () => void }) {
  return (
    <div className="min-h-screen flex flex-col justify-between p-2 sm:p-3 md:p-4 max-w-7xl mx-auto w-full">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={onBackToMenu}
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>←</span>
            <span>Menu</span>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-base sm:text-xl font-bold text-amber-400 font-game tracking-widest drop-shadow">
              SCRABBLE
            </h1>
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-semibold">
              LIVE MATCH
            </span>
          </div>
          <div className="text-[11px] font-bold text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-md hidden sm:block">
            ⚡ DABELTECH
          </div>
        </div>

        {/* Main Game Layout - Fully Mobile Responsive */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-start justify-center">
          
          {/* Timer Section (Placed top on mobile, right on desktop for maximum visibility) */}
          <div className="w-full lg:w-64 order-1 lg:order-3">
            <Timer />
          </div>

          {/* Center: Board + Rack + Controls */}
          <div className="flex-1 flex flex-col items-center w-full max-w-[500px] mx-auto order-2 lg:order-2">
            <Board />
            <div className="mt-2.5 sm:mt-3 w-full">
              <TileRack />
            </div>
            <div className="mt-2 sm:mt-3 w-full">
              <GameControls />
            </div>
          </div>

          {/* Left Panel: Scoreboard & Move History */}
          <div className="w-full lg:w-60 order-3 lg:order-1">
            <ScoreBoard />
          </div>
        </div>
      </div>

      {/* Powered by DABELTECH Branding Footer */}
      <footer className="w-full pt-6 pb-3 mt-4 border-t border-slate-800/80 flex flex-col items-center justify-center gap-1 text-center">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold tracking-widest text-amber-400 uppercase font-sans">
            Powered by DABELTECH
          </span>
        </div>
        <p className="text-[10px] text-slate-500 tracking-wider">
          Single Player AI & Worldwide Multiplayer Online Scrabble
        </p>
      </footer>

      {/* Overlays */}
      <GameOver onBackToMenu={onBackToMenu} />
      <BlankTilePicker />
    </div>
  );
}
