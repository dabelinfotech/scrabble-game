'use client';

import React from 'react';
import { useGameStore } from '@/src/store/gameStore';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function BlankTilePicker() {
  const showBlankPicker = useGameStore((state) => state.showBlankPicker);
  const setBlankLetter = useGameStore((state) => state.setBlankLetter);

  if (!showBlankPicker) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 max-w-md w-full flex flex-col items-center gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <span className="text-3xl mb-1">★</span>
          <h2 className="text-xl font-bold font-game text-amber-300">
            Assign Blank Tile
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Choose which letter this wildcard blank represents for this turn:
          </p>
        </div>

        {/* 26 Letter Grid */}
        <div className="grid grid-cols-7 gap-2 w-full max-w-xs py-2">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => setBlankLetter(letter)}
              className="aspect-square rounded-lg font-bold font-game text-lg bg-gradient-to-br from-amber-100 to-amber-200 text-stone-900 border border-amber-400 hover:scale-110 active:scale-95 hover:brightness-110 shadow transition-all flex items-center justify-center"
            >
              {letter}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-500 italic">
          (Blank tiles count for 0 letter points)
        </span>
      </div>
    </div>
  );
}

