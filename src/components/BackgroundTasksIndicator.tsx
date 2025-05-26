import React, { useEffect } from 'react';
import { useWordsStore } from '../store/wordsStore';

const BackgroundTasksIndicator: React.FC = () => {
  const { backgroundTasks, isBackgroundProcessing, clearCompletedTasks } = useWordsStore();

  // Auto-hide completed and error tasks after 2 seconds
  useEffect(() => {
    const completedOrErrorTasks = backgroundTasks.filter(task =>
      task.status === 'completed' || task.status === 'error'
    );

    if (completedOrErrorTasks.length > 0) {
      const timer = setTimeout(() => {
        clearCompletedTasks();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [backgroundTasks, clearCompletedTasks]);

  if (!isBackgroundProcessing && backgroundTasks.length === 0) {
    return null;
  }

  const activeTasks = backgroundTasks.filter(task => 
    task.status === 'running' || task.status === 'pending'
  );
  
  const completedTasks = backgroundTasks.filter(task => 
    task.status === 'completed'
  );
  
  const errorTasks = backgroundTasks.filter(task => 
    task.status === 'error'
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {activeTasks.map(task => (
        <div key={task.id} className="mb-2 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-800">
              Фоновое добавление слов
            </h4>
            <div className="mx-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-blue-700">
              {task.status === 'running' ? 'Обрабатываем...' : 'В очереди...'}
            </div>
            
            {task.totalItems > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-blue-600">
                  {task.processedItems} / {task.totalItems} слов
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {completedTasks.map(task => (
        <div key={task.id} className="mb-2 bg-green-100 border border-green-300 rounded-lg p-3 shadow-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-800">
                ✅ Слова добавлены!
              </h4>
              <div className="text-xs text-green-700">
                Добавлено {task.result?.length || 0} слов
              </div>
            </div>
            <button
              onClick={clearCompletedTasks}
              className="p-2 text-green-600 hover:text-green-800 text-xs underline"
            >
              Скрыть
            </button>
          </div>
        </div>
      ))}
      
      {errorTasks.map(task => (
        <div key={task.id} className="mb-2 bg-red-100 border border-red-300 rounded-lg p-3 shadow-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-800">
                ❌ Ошибка обработки
              </h4>
              <div className="text-xs text-red-700">
                {task.error}
              </div>
            </div>
            <button
              onClick={clearCompletedTasks}
              className="text-red-600 hover:text-red-800 text-xs underline"
            >
              Скрыть
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BackgroundTasksIndicator;