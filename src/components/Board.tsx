'use client';

import React from 'react';
import { useGameStore } from '@/src/store/gameStore';
import Cell from './Cell';
import { Position } from '@/src/engine/types';

export default function Board() {
  const board = useGameStore((state) => state.board);
  const placedThisTurn = useGameStore((state) => state.placedThisTurn);
  const selectedTile = useGameStore((state) => state.selectedTile);
  const placeTile = useGameStore((state) => state.placeTile);
  const removePlacedTile = useGameStore((state) => state.removePlacedTile);

  if (!board || board.length === 0) {
    return (
      <div className="w-full aspect-square max-w-[500px] flex items-center justify-center bg-emerald-900 rounded-lg text-emerald-200">
        Loading Board...
      </div>
    );
  }

  const handleCellClick = (pos: Position) => {
    // Check if this cell has a tile placed this turn -> click to return to rack
    const isPlacedThisTurn = placedThisTurn.some(
      (pt) => pt.position.row === pos.row && pt.position.col === pos.col
    );

    if (isPlacedThisTurn) {
      removePlacedTile(pos);
      return;
    }

    // Otherwise if we have a selected tile and cell is empty, place it
    if (selectedTile && !board[pos.row][pos.col].tile) {
      placeTile(pos);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="board-grid w-full max-w-[500px] shadow-2xl rounded overflow-hidden">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const pos = { row: r, col: c };
            const tempPlacement = placedThisTurn.find(
              (pt) => pt.position.row === r && pt.position.col === c
            );

            return (
              <Cell
                key={`${r}-${c}`}
                cell={cell}
                position={pos}
                tempTile={tempPlacement ? tempPlacement.tile : undefined}
                onClick={() => handleCellClick(pos)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

