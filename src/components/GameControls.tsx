'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/src/store/gameStore';
import { Tile } from '@/src/engine/types';

export default function GameControls() {
  const placedThisTurn = useGameStore((state) => state.placedThisTurn);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const tileBag = useGameStore((state) => state.tileBag);

  const submitMove = useGameStore((state) => state.submitMove);
  const recallTiles = useGameStore((state) => state.recallTiles);
  const skipTurn = useGameStore((state) => state.skipTurn);
  const exchangeTiles = useGameStore((state) => state.exchangeTiles);

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeSelected, setExchangeSelected] = useState<string[]>([]);

  const currentPlayer = players[currentPlayerIndex];
  const isAITurn = currentPlayer?.isAI;

  const handleToggleExchangeTile = (tileId: string) => {
    if (exchangeSelected.includes(tileId)) {
      setExchangeSelected(exchangeSelected.filter((id) => id !== tileId));
    } else {
      setExchangeSelected([...exchangeSelected, tileId]);
    }
  };

  const handleConfirmExchange = () => {
    if (!currentPlayer) return;
    const tilesToSwap = currentPlayer.rack.filter((t) => exchangeSelected.includes(t.id));
    if (tilesToSwap.length > 0) {
      exchangeTiles(tilesToSwap);
      setShowExchangeModal(false);
      setExchangeSelected([]);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Primary Action Buttons */}
      <div className="grid grid-cols-4 gap-2 w-full">
        {/* Play / Submit */}
        <button
          onClick={submitMove}
          disabled={placedThisTurn.length === 0 || isAITurn}
          className={`
            col-span-2 py-2.5 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all
            ${
              placedThisTurn.length > 0 && !isAITurn
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }
          `}
        >
          <span>✅</span> Play Move {placedThisTurn.length > 0 ? `(${placedThisTurn.length})` : ''}
        </button>

        {/* Recall */}
        <button
          onClick={recallTiles}
          disabled={placedThisTurn.length === 0 || isAITurn}
          className={`
            py-2.5 px-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 border transition-all
            ${
              placedThisTurn.length > 0 && !isAITurn
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }
          `}
          title="Return placed tiles back to your rack"
        >
          <span>↩️</span> Recall
        </button>

        {/* Pass / Skip */}
        <button
          onClick={skipTurn}
          disabled={isAITurn}
          className="py-2.5 px-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Skip your turn without placing tiles"
        >
          <span>⏭️</span> Pass
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => {
            recallTiles();
            setShowExchangeModal(true);
          }}
          disabled={tileBag.length < 7 || isAITurn}
          className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-40 disabled:hover:text-slate-400"
        >
          <span>🔄</span> Exchange Tiles with Bag
        </button>
      </div>

      {/* Exchange Modal */}
      {showExchangeModal && currentPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
            <h3 className="font-bold text-lg text-amber-300 flex items-center gap-2">
              <span>🔄</span> Exchange Tiles
            </h3>
            <p className="text-xs text-slate-300">
              Select the tiles from your rack that you want to return to the bag and replace. Exchanging will use your turn.
            </p>

            {/* Selectable tiles */}
            <div className="flex flex-wrap gap-2 justify-center py-2">
              {currentPlayer.rack.map((tile: Tile) => {
                const isSelected = exchangeSelected.includes(tile.id);
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleToggleExchangeTile(tile.id)}
                    className={`
                      w-11 h-11 rounded font-bold font-game text-base flex flex-col items-center justify-center border-2 transition-all
                      ${
                        isSelected
                          ? 'bg-amber-400 text-stone-900 border-yellow-200 scale-105 shadow-md'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                      }
                    `}
                  >
                    <span>{tile.letter || '★'}</span>
                    <span className="text-[9px] font-sans -mt-1 font-normal opacity-80">
                      {tile.points}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowExchangeModal(false);
                  setExchangeSelected([]);
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExchange}
                disabled={exchangeSelected.length === 0}
                className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                Exchange ({exchangeSelected.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

