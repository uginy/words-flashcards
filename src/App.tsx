import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import FlashCard from './components/FlashCard';
import WordInput from './components/WordInput';
import WordTable from './components/WordTable';
import Statistics from './components/Statistics';
import { useWords } from './hooks/useWords';
import Settings from './components/Settings';
import { parseAndTranslateWords } from './utils/translation';

function App() {
  const [activeTab, setActiveTab] = useState('learn');
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

  // Add default words if none exist
  useEffect(() => {
    const hasAddedDefaultWords = sessionStorage.getItem('hasAddedDefaultWords');
    if (words.length === 0 && !hasAddedDefaultWords) {
      sessionStorage.setItem('hasAddedDefaultWords', 'true');
      const defaultWordsStructured = `
noun - ניסיון - нисайон - опыт
noun - מוצר - муцар - продукт
noun - מידע - мэйда - информация
noun - כמות - камут - количество
noun - אחריות - ахрают - ответственность
noun - יכולת - йехолет - способность
verb - להשפיע על - леашпиа аль - влиять на - משפיע, השפיע, ישפיע
verb - לבחור ב, את - ливхор - выбирать - בוחר, בחר, יבחר
verb - להתלבט בין לבין - леитлабет бейн лебейн - колебаться между - מתלבט, התלבט, יתלבט
verb - להתחרט על - леитхарет аль - сожалеть о - מתחרט, התחרט, יתחרט
verb - להציע את ל - леациа эт ле - предлагать кому-либо - מציע, הציע, יציע
verb - להתבגר - леитבагер - взрослеть - מתבגר, התבגר, יתבגר
verb - להתווכח - леитвакеах - спорить - מתווכח, התווכח, יתווכח
verb - להתרכז - леитракез - концентрироваться - מתרכז, התרכז, יתרכז
adjective - מתבגר-ת - митבагер-эт - взрослеющий(-ая)
adjective - אחראי-ת - ахраи-т - ответственный(-ая)
adjective - מוכשר-ת - мухшар-эт - талантливый(-ая)
adjective - מבולבל-ת - мевульбаль-эт - запутанный(-ая)
adjective - מרוכז-ת - меруказ-эт - сосредоточенный(-ая)
other - היכן - эйхан - где`.trim();
      
      try {
        const parsedWords = parseAndTranslateWords(defaultWordsStructured);
        if (Array.isArray(parsedWords) && parsedWords.length > 0) {
          addWords(parsedWords);
        }
      } catch (error) {
        console.error('Error parsing default words:', error);
      }
    }
  }, [words.length, addWords]);

  // Render different content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'learn':
        return (
          <div className="space-y-6">
            <Statistics
              total={stats.total}
              learned={stats.learned}
              remaining={stats.remaining}
            />
            
            {currentWord ? (
              <div className="animate-fadeIn">
                <FlashCard
                  word={currentWord}
                  onMarkLearned={markAsLearned}
                  onNext={nextWord}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-blue-500 mb-3">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Все слова изучены!</h3>
                <p className="text-gray-600 mb-4">
                  Вы выучили все слова в вашем списке. Вы можете добавить новые слова или сбросить прогресс.
                </p>
                <button
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
        return <WordInput onAddWords={addWords} />;
        
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
      <Toaster
        position="top-right"
        toastOptions={{
          className: '',
          duration: 3000,
          style: {
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            style: {
              background: '#059669',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#DC2626',
              color: '#fff',
            },
          },
        }}
      />
      <Layout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </div>
  );
}

export default App;