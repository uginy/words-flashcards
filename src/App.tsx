import React, { useState, useRef, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster'; // shadcn/ui Toaster
import Layout from './components/Layout';
import FlashCard from './components/FlashCard';
import WordInput from './components/WordInput';
import WordTable from './components/WordTable';
import Statistics from './components/Statistics';
import { useWordsStore, getStats } from './store/wordsStore';
import Settings from './components/Settings';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './components/ui/select';

function App() {
  const [activeTab, setActiveTab] = useState('learn');
  const [reverseMode, setReverseMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // State for status filter: 'all' | 'learned' | 'not_learned'
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'learned' | 'not_learned'>('all');
  const [filteredIndex, setFilteredIndex] = useState(0);
  const wordInputRef = useRef<HTMLDivElement>(null);

  // Получаем данные и методы из Zustand-стора
  const {
    words,
    markAsLearned,
    markAsNotLearned,
    deleteWord,
    resetProgress,
    nextWord,
  } = useWordsStore();

  // Получаем список уникальных категорий из слов
  const categories = Array.from(new Set(words.map(w => w.category))).filter(Boolean);
  const categoryOptions = [{ value: 'all', label: 'Все категории' }, ...categories.map(c => ({ value: c, label: c }))];

  // Фильтруем слова по выбранной категории и статусу (только для режима "Учить")
  const filteredWords = words.filter(w => {
    const categoryMatch = selectedCategory === 'all' || w.category === selectedCategory;
    let statusMatch = true;
    if (selectedStatus === 'learned') statusMatch = w.isLearned;
    if (selectedStatus === 'not_learned') statusMatch = !w.isLearned;
    return categoryMatch && statusMatch;
  });

  // Статистика только по отфильтрованным словам
  const stats = getStats(filteredWords);

  // Получаем текущее слово для обучения по filteredIndex
  const currentWord = filteredWords[filteredIndex];

  // Обработчик для "Знаю"
  const handleMarkAsLearned = (id: string) => {
    // Если выбран статус "изученные", просто переходим к следующему слову, не меняя статус
    if (selectedStatus === 'learned') {
      handleNextWord();
      return;
    }
    markAsLearned(id);
    // Если после отметки все слова выучены, сбрасываем filteredIndex
    if (getStats(filteredWords).remaining <= 1) {
      setFilteredIndex(0);
    } else {
      handleNextWord();
    }
  };

  // Обработчик для "Далее" — только по filteredWords
  const handleNextWord = () => {
    if (filteredWords.length === 0) return;
    // Для "изученных" просто листаем по кругу
    if (selectedStatus === 'learned') {
      setFilteredIndex((prev) => (prev + 1) % filteredWords.length);
      return;
    }
    // Для остальных — ищем следующий невыученный
    if (getStats(filteredWords).remaining === 0) {
      return;
    }
    let nextIdx = filteredIndex;
    let attempts = 0;
    do {
      nextIdx = (nextIdx + 1) % filteredWords.length;
      attempts++;
      if (attempts > filteredWords.length) break;
    } while (filteredWords[nextIdx]?.isLearned);
    setFilteredIndex(nextIdx);
  };

  // Сброс filteredIndex при смене категории или слов
  useEffect(() => {
    setFilteredIndex(0);
  }, [selectedCategory, selectedStatus, words.length]);


  // Скролл к WordInput после перехода на вкладку "Добавить"
  useEffect(() => {
    if (activeTab === 'add' && wordInputRef.current) {
      wordInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTab]);

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
            {/* Фильтр по категориям и переключатель режима обучения */}
            <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:gap-4 sm:justify-center">
              <div className="w-full sm:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория:</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус:</label>
                <Select value={selectedStatus} onValueChange={v => setSelectedStatus(v as 'all' | 'learned' | 'not_learned')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="learned">Изученные</SelectItem>
                    <SelectItem value="not_learned">Не изученные</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center cursor-pointer select-none ml-0 sm:ml-6">
                <input
                  type="checkbox"
                  checked={reverseMode}
                  onChange={() => setReverseMode((v) => !v)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">Русский → Иврит (реверсивный режим)</span>
              </label>
            </div>
            <Statistics stats={stats} />
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
            ) : (
              // Поздравительный блок только если выбран статус "all" или "not_learned" и все слова выучены
              (['all', 'not_learned'].includes(selectedStatus) && stats.remaining === 0 && stats.total > 0) ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center animate-fadeIn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-green-500 mb-3">
                    <title>Поздравляем!</title>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Поздравляем!</h3>
                  <p className="text-gray-600 mb-4">
                    Вы выучили все слова в списке! Что хотите сделать дальше?
                  </p>
                  <div className="flex flex-col gap-2 mt-4 items-center">
                    <button
                      type="button"
                      onClick={() => resetProgress()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Сбросить прогресс
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('add');
                        setTimeout(() => {
                          if (wordInputRef.current) {
                            wordInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 100);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Добавить новые слова
                    </button>
                  </div>
                </div>
              ) : (
                // FlashCard для "изученные" показывается всегда если есть хотя бы одно слово,
                // для других статусов — только если есть слова для изучения
                ((selectedStatus === 'learned' && stats.total > 0) ||
                  (selectedStatus !== 'learned' && stats.remaining > 0)) && (
                  <div className="animate-fadeIn">
                    {currentWord && (
                      <FlashCard
                        word={currentWord}
                        reverse={reverseMode}
                        onMarkAsLearned={handleMarkAsLearned}
                        onNext={handleNextWord}
                      />
                    )}
                  </div>
                )
              )
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
        {activeTab === 'add' ? (
          <div ref={wordInputRef}>
            <WordInput />
          </div>
        ) : (
          renderContent()
        )}
      </Layout>
    </div>
  );
}

export default App;