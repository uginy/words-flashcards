import React from 'react';
import { useAutoModeStore } from '../store/autoModeStore';

interface AutoModeControlsProps {
  totalWords: number;
  currentIndex: number;
}

const AutoModeControls: React.FC<AutoModeControlsProps> = ({ totalWords, currentIndex }) => {
  const { isPlaying, currentPosition, play, stop, setPosition } = useAutoModeStore();

  const handleToggle = () => {
    if (isPlaying) {
      stop();
    } else {
      // Sync position with current card index when starting
      setPosition(currentIndex);
      play();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-white text-base font-medium transition-colors ${
          isPlaying
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        title={isPlaying ? 'Остановить авто-режим' : 'Запустить авто-режим'}
      >
        {isPlaying ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            <span>Стоп</span>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Авто-режим</span>
          </>
        )}
      </button>
      
      {isPlaying && (
        <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
          <span className="font-medium">Авто-режим активен</span>
          <span className="ml-2">({currentPosition + 1}/{totalWords})</span>
        </div>
      )}
    </div>
  );
};

export default AutoModeControls;
