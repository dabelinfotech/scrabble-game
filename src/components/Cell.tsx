'use client';

import React from 'react';
import { CellState, Position } from '@/src/engine/types';
import Tile from './Tile';

interface CellProps {
  cell: CellState;
  position: Position;
  tempTile?: CellState['tile'];
  onClick: () => void;
}

export default function Cell({ cell, position, tempTile, onClick }: CellProps) {
  const displayTile = tempTile || cell.tile;
  const isTemp = !!tempTile;

  const getPremiumLabel = () => {
    switch (cell.premium) {
      case 'TW':
        return 'TW';
      case 'DW':
        return 'DW';
      case 'TL':
        return 'TL';
      case 'DL':
        return 'DL';
      case 'CENTER':
        return '★';
      default:
        return '';
    }
  };

  const getPremiumClass = () => {
    switch (cell.premium) {
      case 'TW':
        return 'cell-tw';
      case 'DW':
        return 'cell-dw';
      case 'TL':
        return 'cell-tl';
      case 'DL':
        return 'cell-dl';
      case 'CENTER':
        return 'cell-center';
      default:
        return 'cell-normal';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        cell ${getPremiumClass()}
        aspect-square flex items-center justify-center p-[1px]
        relative transition-all duration-100 select-none touch-manipulation
      `}
      title={`R${position.row + 1} C${position.col + 1} (${cell.premium})`}
    >
      {displayTile ? (
        <Tile tile={displayTile} isTemp={isTemp} />
      ) : (
        <span className="font-bold tracking-tighter opacity-80 pointer-events-none">
          {getPremiumLabel()}
        </span>
      )}
    </div>
  );
}

