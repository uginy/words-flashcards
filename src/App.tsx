import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FlashCard from './components/FlashCard';
import WordInput from './components/WordInput';
import WordTable from './components/WordTable';
import Statistics from './components/Statistics';
import { useWords } from './hooks/useWords';

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
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 7h10" />
          <path d="M7 12h10" />
          <path d="M7 17h10" />
        </svg>
      ),
    },
  ];

  // Add default words if none exist
  useEffect(() => {
    if (words.length === 0) {
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
other - היכן - эйхан - где
      `.trim();
      addWords(defaultWordsStructured);
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
        
      default:
        return null;
    }
  };

  return (
    <Layout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;