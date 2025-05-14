import React from 'react';

interface StatisticsProps {
  total: number;
  learned: number;
  remaining: number;
}

const Statistics: React.FC<StatisticsProps> = ({ total, learned, remaining }) => {
  // Calculate progress percentage
  const progressPercent = total > 0 ? Math.round((learned / total) * 100) : 0;
  
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Статистика</h3>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-md">
            <div className="text-2xl font-semibold text-blue-600">{total}</div>
            <div className="text-xs text-gray-600">Всего слов</div>
          </div>
          
          <div className="text-center p-2 bg-green-50 rounded-md">
            <div className="text-2xl font-semibold text-green-600">{learned}</div>
            <div className="text-xs text-gray-600">Изучено</div>
          </div>
          
          <div className="text-center p-2 bg-yellow-50 rounded-md">
            <div className="text-2xl font-semibold text-yellow-600">{remaining}</div>
            <div className="text-xs text-gray-600">Осталось</div>
          </div>
        </div>
        
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>Прогресс</span>
          <span>{progressPercent}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;