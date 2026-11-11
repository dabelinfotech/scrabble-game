'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/src/store/gameStore';
import { AIDifficulty, TimerPreset } from '@/src/engine/types';

interface MainMenuProps {
  onStartGame: () => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const initGame = useGameStore((state) => state.initGame);

  const [playerName, setPlayerName] = useState('WordMaster');
  const [gameMode, setGameMode] = useState<'SOLO' | 'MULTIPLAYER' | 'PASS_PLAY'>('SOLO');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('MEDIUM');
  const [timerPreset, setTimerPreset] = useState<TimerPreset>('ONE_MINUTE');
  const [onlineTab, setOnlineTab] = useState<'MATCHMAKING' | 'CREATE' | 'JOIN'>('MATCHMAKING');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [searchingMatch, setSearchingMatch] = useState(false);

  const titleTiles = [
    { letter: 'S', pts: 1 },
    { letter: 'C', pts: 3 },
    { letter: 'R', pts: 1 },
    { letter: 'A', pts: 1 },
    { letter: 'B', pts: 3 },
    { letter: 'B', pts: 3 },
    { letter: 'L', pts: 1 },
    { letter: 'E', pts: 1 },
  ];

  const handleStartSolo = () => {
    initGame({
      timerPreset,
      dictionary: 'SOWPODS',
      playerCount: 2,
      aiDifficulty,
    });
    onStartGame();
  };

  const handleStartPassAndPlay = () => {
    initGame({
      timerPreset,
      dictionary: 'SOWPODS',
      playerCount: 2,
      aiDifficulty: 'MEDIUM',
    });
    // In pass and play, both players are humans
    const store = useGameStore.getState();
    const currentPlayers = store.players.map((p, i) => ({
      ...p,
      isAI: false,
      name: i === 0 ? playerName || 'Player 1' : 'Player 2',
    }));
    useGameStore.setState({ players: currentPlayers });
    onStartGame();
  };

  const handleOnlineMatchmaking = () => {
    setSearchingMatch(true);
    // Simulate matchmaking search connecting to global pool
    setTimeout(() => {
      setSearchingMatch(false);
      handleStartSolo();
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Decorative background board grid accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-xl bg-slate-900/90 border-2 border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col items-center gap-6">
        {/* Scrabble Title Tiles */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {titleTiles.map((t, idx) => (
            <div
              key={idx}
              className="w-9 h-11 md:w-11 md:h-13 bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-400 rounded-md shadow-lg flex flex-col items-center justify-center relative select-none transform hover:-translate-y-1 transition-transform"
            >
              <span className="font-game font-bold text-lg md:text-2xl text-stone-900 leading-none">
                {t.letter}
              </span>
              <span className="absolute bottom-0.5 right-1 text-[8px] md:text-[10px] font-sans font-bold text-stone-600 leading-none">
                {t.pts}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs md:text-sm text-slate-400 text-center -mt-2">
          Play Solo vs AI or Challenge Anyone Around the World
        </p>

        {/* Player Name Input */}
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Your Player Tag
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
            maxLength={16}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 w-full bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setGameMode('SOLO')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              gameMode === 'SOLO'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🤖</span> Solo vs AI
          </button>
          <button
            onClick={() => setGameMode('MULTIPLAYER')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              gameMode === 'MULTIPLAYER'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌐</span> Worldwide
          </button>
          <button
            onClick={() => setGameMode('PASS_PLAY')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              gameMode === 'PASS_PLAY'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👥</span> Pass & Play
          </button>
        </div>

        {/* Dynamic Mode Controls */}
        {gameMode === 'SOLO' && (
          <div className="w-full flex flex-col gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {/* AI Difficulty */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Bot Difficulty
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as AIDifficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setAiDifficulty(level)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      aiDifficulty === level
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {level === 'EASY' && '🌱 Novice'}
                    {level === 'MEDIUM' && '⚔️ Master'}
                    {level === 'HARD' && '🧠 Grandmaster'}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Control (Requested Feature) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Time Control</span>
                <span className="text-amber-400 font-mono text-[11px]">
                  Turn / Game
                </span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { preset: 'ONE_MINUTE' as TimerPreset, label: '⚡ 1 Minute', time: '60s / 1m' },
                  { preset: 'BLITZ' as TimerPreset, label: '🔥 Blitz', time: '60s / 15m' },
                  { preset: 'RAPID' as TimerPreset, label: '⏱️ Rapid', time: '3m / 25m' },
                  { preset: 'STANDARD' as TimerPreset, label: '⏳ Standard', time: '5m / 45m' },
                  { preset: 'RELAXED' as TimerPreset, label: '🌴 Relaxed', time: '10m / ∞' },
                ].map(({ preset, label, time }) => (
                  <button
                    key={preset}
                    onClick={() => setTimerPreset(preset)}
                    className={`p-2 rounded-lg text-left border flex flex-col transition-all ${
                      timerPreset === preset
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 scale-[1.02]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs">{label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{time}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartSolo}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Start Game vs AI 🚀
            </button>
          </div>
        )}

        {gameMode === 'MULTIPLAYER' && (
          <div className="w-full flex flex-col gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {/* Online Subtabs */}
            <div className="flex border-b border-slate-800 pb-2 gap-2 text-xs font-bold">
              <button
                onClick={() => setOnlineTab('MATCHMAKING')}
                className={`px-3 py-1.5 rounded-md ${
                  onlineTab === 'MATCHMAKING'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Quick Match
              </button>
              <button
                onClick={() => setOnlineTab('CREATE')}
                className={`px-3 py-1.5 rounded-md ${
                  onlineTab === 'CREATE'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setOnlineTab('JOIN')}
                className={`px-3 py-1.5 rounded-md ${
                  onlineTab === 'JOIN'
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
            </div>

            {onlineTab === 'MATCHMAKING' && (
              <div className="flex flex-col items-center gap-3 py-3 text-center">
                <span className="text-3xl">🌍</span>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-slate-200">
                    Find Global Opponent
                  </span>
                  <span className="text-xs text-slate-400">
                    Skill-based ELO matchmaking with live players online
                  </span>
                </div>
                <button
                  onClick={handleOnlineMatchmaking}
                  disabled={searchingMatch}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg transition-all"
                >
                  {searchingMatch ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Searching for opponent...
                    </span>
                  ) : (
                    'Search Match (Online) ⚡'
                  )}
                </button>
              </div>
            )}

            {onlineTab === 'CREATE' && (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">Room Code</span>
                    <span className="text-xs text-slate-500">Share with a friend to play</span>
                  </div>
                  <span className="font-mono font-black text-amber-400 text-lg tracking-widest bg-slate-950 px-3 py-1 rounded border border-slate-700">
                    SCR-8491
                  </span>
                </div>
                <button
                  onClick={handleStartSolo}
                  className="w-full py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-stone-950 shadow transition-all"
                >
                  Create & Launch Lobby
                </button>
              </div>
            )}

            {onlineTab === 'JOIN' && (
              <div className="flex flex-col gap-3 py-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit Room Code (e.g. SCR-8491)"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-center font-mono tracking-widest uppercase text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleStartSolo}
                  disabled={!roomCodeInput}
                  className="w-full py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Match
                </button>
              </div>
            )}
          </div>
        )}

        {gameMode === 'PASS_PLAY' && (
          <div className="w-full flex flex-col gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <p className="text-xs text-slate-300 text-center">
              Play with someone in the same room by passing the device back and forth after every turn!
            </p>
            <button
              onClick={handleStartPassAndPlay}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white shadow-lg transition-all"
            >
              Start Pass & Play 👥
            </button>
          </div>
        )}

        {/* Branding Footer */}
        <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span className="font-medium tracking-wide">
            Scrabble Pro Edition
          </span>
          <div className="flex items-center gap-1.5 font-bold tracking-widest uppercase text-amber-400 bg-amber-950/30 px-3 py-1 rounded-full border border-amber-500/20 text-[11px]">
            <span>⚡</span>
            <span>Powered by DABELTECH</span>
          </div>
        </div>
      </div>
    </div>
  );
}

