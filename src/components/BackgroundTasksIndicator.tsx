import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWordsStore } from '../store/wordsStore';

const BackgroundTasksIndicator = () => {
  const { t } = useTranslation();
  const { backgroundTasks, isBackgroundProcessing, clearCompletedTasks, cancelBackgroundTask } = useWordsStore();

  // Auto-hide completed and error tasks after 3 seconds
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
              {t('backgroundTasks.addingWords')}
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-3" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-blue-700">
              {task.status === 'running' ? t('backgroundTasks.processing') : t('backgroundTasks.inQueue')}
            </div>

            {task.totalItems > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-blue-600">
                  {task.processedItems} / {task.totalItems} {t('backgroundTasks.words')}
                </div>
                {task.status === 'running' && (task.added > 0 || task.skipped > 0 || task.failed > 0) && (
                  <div className="text-xs text-blue-600">
                    {t('backgroundTasks.added')}: {task.added}, {t('backgroundTasks.skipped')}: {task.skipped}, {t('backgroundTasks.failed')}: {task.failed}
                  </div>
                )}
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => cancelBackgroundTask(task.id)}
            className="text-red-600 hover:text-red-800 text-xs underline"
            title={t('backgroundTasks.cancelTask')}
          >
            {t('backgroundTasks.cancel')}
          </button>
        </div>
      ))}

      {completedTasks.map(task => (
        <div key={task.id} className="mb-2 bg-green-100 border border-green-300 rounded-lg p-3 shadow-lg animate-pulse">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h4 className="text-sm font-medium text-green-800">
                ✅ {t('backgroundTasks.completed')}
              </h4>
              <div className="text-xs text-green-700 space-y-1">
                <div>{t('backgroundTasks.added')}: {task.added}</div>
                {task.skipped > 0 && <div>{t('backgroundTasks.skipped')}: {task.skipped}</div>}
                {task.failed > 0 && (
                  <div className="text-red-600">
                    {t('backgroundTasks.failed')}: {task.failed}
                    {task.failedWords.length > 0 && (
                      <div className="text-xs mt-1">
                        ({task.failedWords.slice(0, 3).join(', ')}{task.failedWords.length > 3 ? '...' : ''})
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={clearCompletedTasks}
              className="p-2 text-green-600 hover:text-green-800 text-xs underline mx-2"
            >
              {t('backgroundTasks.hide')}
            </button>
          </div>
        </div>
      ))}

      {errorTasks.map(task => (
        <div key={task.id} className="mb-2 bg-red-100 border border-red-300 rounded-lg p-3 shadow-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-800">
                ❌ {t('backgroundTasks.errorProcessing')}
              </h4>
              <div className="text-xs text-red-700">
                {task.error}
              </div>
            </div>
            <button
              type="button"
              onClick={clearCompletedTasks}
              className="text-red-600 hover:text-red-800 text-xs underline mx-2"
            >
              {t('backgroundTasks.hide')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BackgroundTasksIndicator;