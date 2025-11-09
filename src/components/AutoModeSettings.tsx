import React from 'react';
import { useAutoModeStore } from '../store/autoModeStore';

const AutoModeSettings: React.FC = () => {
  const {
    hebrewDelay,
    russianDelay,
    cardDelay,
    setHebrewDelay,
    setRussianDelay,
    setCardDelay,
  } = useAutoModeStore();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Настройки авто-режима</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Задержка после иврита (мс)
          </label>
          <input
            type="number"
            min="0"
            max="10000"
            step="100"
            value={hebrewDelay}
            onChange={(e) => setHebrewDelay(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Пауза после озвучки слова на иврите
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Задержка после русского (мс)
          </label>
          <input
            type="number"
            min="0"
            max="10000"
            step="100"
            value={russianDelay}
            onChange={(e) => setRussianDelay(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Пауза после озвучки перевода на русский
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Задержка перед следующей карточкой (мс)
          </label>
          <input
            type="number"
            min="0"
            max="10000"
            step="100"
            value={cardDelay}
            onChange={(e) => setCardDelay(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Пауза перед переходом к следующей карточке
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Совет:</span> В авто-режиме статистика не обновляется. 
          Это режим для пассивного прослушивания карточек.
        </p>
      </div>
    </div>
  );
};

export default AutoModeSettings;
