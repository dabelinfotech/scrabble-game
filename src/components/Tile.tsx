'use client';

import React from 'react';
import { Tile as TileType } from '@/src/engine/types';

interface TileProps {
  tile: TileType;
  isSelected?: boolean;
  isTemp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function Tile({
  tile,
  isSelected = false,
  isTemp = false,
  size = 'md',
  onClick,
}: TileProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-[9px]',
    md: 'w-full h-full text-[9px] sm:text-xs md:text-sm lg:text-base',
    lg: 'w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-xl',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center justify-center font-bold font-game select-none touch-manipulation
        rounded-[2px] sm:rounded shadow-sm sm:shadow-md transition-all duration-150 cursor-pointer
        ${isTemp ? 'bg-amber-100 border sm:border-2 border-dashed border-amber-500 scale-95' : 'bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-400'}
        ${isSelected ? 'ring-2 ring-yellow-400 -translate-y-1 shadow-lg' : 'hover:brightness-105 active:scale-95'}
        ${sizeClasses}
      `}
      title={tile.isBlank ? 'Blank Tile (Wildcard)' : `${tile.letter} (${tile.points} pts)`}
    >
      <span className="text-stone-900 leading-none">
        {tile.letter || (tile.isBlank ? '★' : '')}
      </span>
      <span className="absolute bottom-[1px] right-[1px] sm:right-1 text-[5px] sm:text-[7px] md:text-[8px] font-sans font-bold text-stone-600 leading-none pointer-events-none">
        {tile.points > 0 ? tile.points : ''}
      </span>
    </div>
  );
}

