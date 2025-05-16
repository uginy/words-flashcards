import React, { useState } from 'react';
import { Toaster } from '@/components/ui/toaster'; // shadcn/ui Toaster
import Layout from './components/Layout';
import FlashCard from './components/FlashCard';
import WordInput from './components/WordInput';
import WordTable from './components/WordTable';
import Statistics from './components/Statistics';
import { useWords } from './hooks/useWords';
import Settings from './components/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('learn');
  const [reverseMode, setReverseMode] = useState(false); // Режим Русский → Иврит
  const { 
    words, 
    currentWord, 
    addWords, 
    markAsLearned, 
    markAsNotLearned, 
    nextWord, 
    resetProgress, 
    deleteWord,
    stats
  } = useWords();

  // Define tabs with icons
  const tabs = [
    {
      id: 'learn',
      label: 'Учить',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <title>Учить</title>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      id: 'add',
      label: 'Добавить',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <title>Добавить</title>
          <path d="M11 12H3" />
          <path d="M16 6H3" />
          <path d="M16 18H3" />
          <path d="M18 9v6" />
          <path d="M21 12h-6" />
        </svg>
      ),
    },
    {
      id: 'list',
      label: 'Список',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <title>Список</title>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 7h10" />
          <path d="M7 12h10" />
          <path d="M7 17h10" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
          <title>Настройки</title>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 .25 1l-.01.44a2 2 0 0 1-1.73 1l-.25.43a2 2 0 0 1 0 2l.08.15a2 2 0 0 0 .73 2.73l.38.22a2 2 0 0 0 2.73-.73l.1-.15a2 2 0 0 1 1-.25l.43-.01a2 2 0 0 1 1.73 1V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-.25-1l.01-.44a2 2 0 0 1 1.73-1l.25-.43a2 2 0 0 1 0 2l-.08-.15a2 2 0 0 0-.73-2.73l-.38-.22a2 2 0 0 0-2.73.73l-.1.15a2 2 0 0 1-1 .25l-.43.01a2 2 0 0 1-1.73-1V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      ),
    },
  ];

  // Render different content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'learn':
        return (
          <div className="space-y-6">
             {/* Переключатель режима обучения */}
            <div className="flex items-center gap-4 mb-2 align-middle justify-center">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reverseMode}
                  onChange={() => setReverseMode((v) => !v)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">Русский → Иврит (реверсивный режим)</span>
              </label>
            </div>
            <Statistics
              total={stats.total}
              learned={stats.learned}
              remaining={stats.remaining}
            />
            {stats.total === 0 ? (
              // Case: No words in the list at all
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-green-500 mb-3">
                  <title>Список слов пуст</title>
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Список слов пуст</h3>
                <p className="text-gray-600 mb-4">
                  Добавьте слова, чтобы начать изучение.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Добавить слова
                </button>
              </div>
            ) : currentWord ? (
              // Case: There are words and a current word to display
              <div className="animate-fadeIn">
                <FlashCard
                  word={currentWord}
                  onMarkLearned={markAsLearned}
                  onNext={nextWord}
                  reverse={reverseMode}
                />
              </div>
            ) : (
              // Case: There are words, but all are learned
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-blue-500 mb-3">
                  <title>Все слова изучены</title>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Все слова изучены!</h3>
                <p className="text-gray-600 mb-4">
                  Вы выучили все слова в вашем списке. Вы можете добавить новые слова или сбросить прогресс.
                </p>
                <button
                  type="button"
                  onClick={resetProgress}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Сбросить прогресс
                </button>
              </div>
            )}
          </div>
        );
        
      case 'add':
        return <WordInput />;
        
      case 'list':
        return (
          <WordTable
            words={words}
            onMarkLearned={markAsLearned}
            onMarkNotLearned={markAsNotLearned}
            onDeleteWord={deleteWord}
          />
        );
      case 'settings': // Add case for settings tab
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Toaster />
      <Layout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </div>
  );
}

export default App;