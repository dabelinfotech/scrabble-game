'use client';

import React from 'react';
import { useGameStore } from '@/src/store/gameStore';
import { Tile } from '@/src/engine/types';

export default function TileRack() {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const selectedTile = useGameStore((state) => state.selectedTile);
  const selectTile = useGameStore((state) => state.selectTile);
  const shuffleRack = useGameStore((state) => state.shuffleRack);
  const tileBag = useGameStore((state) => state.tileBag);

  const currentPlayer = players[currentPlayerIndex];

  if (!currentPlayer) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* Player notification bar */}
      <div className="flex items-center justify-between w-full px-2 text-xs text-slate-300">
        <span className="font-semibold text-amber-300">
          {currentPlayer.name}'s Rack {currentPlayer.isAI ? '(AI thinking...)' : ''}
        </span>
        <span className="text-slate-400">
          Bag: <strong className="text-white">{tileBag.length}</strong> tiles left
        </span>
      </div>

      {/* Rack container */}
      <div className="rack w-full flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
        {currentPlayer.rack.map((tile: Tile) => {
          const isSelected = selectedTile?.id === tile.id;

          return (
            <div
              key={tile.id}
              onClick={() => selectTile(tile)}
              className={`rack-tile touch-manipulation ${isSelected ? 'selected' : ''}`}
            >
              <span className="rack-tile-letter">
                {tile.isBlank ? (tile.letter || '★') : tile.letter}
              </span>
              <span className="rack-tile-points">
                {tile.points > 0 ? tile.points : ''}
              </span>
            </div>
          );
        })}

        {currentPlayer.rack.length === 0 && (
          <div className="text-xs text-amber-200/60 italic py-2">
            Rack is empty!
          </div>
        )}
      </div>

      {/* Rack Quick Actions */}
      <div className="flex justify-end w-full px-1">
        <button
          onClick={shuffleRack}
          title="Shuffle Rack (Spacebar)"
          className="text-xs text-amber-300/80 hover:text-amber-200 flex items-center gap-1 hover:underline transition-all"
        >
          <span>🔀</span> Shuffle Letters
        </button>
      </div>
    </div>
  );
}

