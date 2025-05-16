import { useState, useEffect } from 'react';
import { useToast } from '../hooks/use-toast'; // shadcn/ui toast
import type { Word, WordsState } from '../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';

const initialState: WordsState = {
  words: [],
  currentIndex: 0,
};

export const useWords = () => {
  const [state, setState] = useState<WordsState>(initialState);
  const { toast } = useToast();
  console.log(state);
  
  // Public callback to manually refresh state from localStorage
  const updateWords = (words: Word[] | null) => {
    if (words) {
      setState({
        words,
        currentIndex: 0,
      });
    } else {
      setState(initialState);
    }
  };

  // Load from localStorage on initial render
  useEffect(() => {
    const savedState = loadFromLocalStorage();
    if (savedState) {
      // Ensure loaded state has at least the core properties
      setState({
        words: savedState.words || [],
        currentIndex: savedState.currentIndex || 0,
      });
    }
  }, []);
  
  // Save to localStorage whenever state changes
  useEffect(() => {
    // Only save if there's something meaningful to save
    if (state.words.length > 0 || state.currentIndex !== 0) { 
      saveToLocalStorage(state);
    }
  }, [state]);
  
  // Sync state with localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'hebrew-flashcards-data') {
        const savedState = loadFromLocalStorage();
        if (savedState) {
          setState({
            words: savedState.words || [],
            currentIndex: savedState.currentIndex || 0,
          });
        } else {
          setState(initialState);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Add new words. Accepts an array of Word objects.
  const addWords = async (newWordsFromInput: Word[]) => {
    try {
      // Input is now an array of Word objects, so no parsing is needed.
      // Filter out any words that might be empty or invalid, though this should ideally be handled before calling addWords.
      // Filter out any words missing critical fields
      const initialValidWords = newWordsFromInput.filter(word => word.hebrew && word.russian);
      // Remove any duplicates in the batch by hebrew+russian
      const validNewWords = initialValidWords.filter((word, index, self) =>
        self.findIndex(w => w.hebrew === word.hebrew && w.russian === word.russian) === index
      );
      // Notify if batch contained duplicates
      if (validNewWords.length < initialValidWords.length) {
        const dupCount = initialValidWords.length - validNewWords.length;
        toast({
          title: "Информация",
          description: `Пропущено ${dupCount} дублирующих слов во вводе`,
        });
      }
      // console.log('[useWords] Number of validNewWords (received by addWords):', validNewWords.length, validNewWords); // DEBUG - Removed

      if (validNewWords.length === 0) {
        // It's possible all incoming words were invalid or empty.
        toast({
          title: "Ошибка",
          description: 'Нет валидных слов для добавления.',
          variant: "destructive",
        });
        return; // Exit if no valid words
      }

      setState(prev => {
        // If there are no words in the state, all new words are unique
        if (prev.words.length === 0) {
          return {
            ...prev,
            words: validNewWords
          };
        }
        
        const uniqueNewWords = validNewWords.filter(
          newWord => !prev.words.some(existingWord =>
            existingWord.hebrew === newWord.hebrew &&
            existingWord.russian === newWord.russian
          )
        );
        // console.log('[useWords] Number of uniqueNewWords (after filtering existing):', uniqueNewWords.length, uniqueNewWords); // DEBUG - Removed

        if (uniqueNewWords.length === 0) {
          toast({
            title: "Ошибка",
            description: 'Эти слова уже существуют в вашей коллекции.',
            variant: "destructive",
          });
          return prev;
        }

        const count = uniqueNewWords.length;
        const wordForm = count === 1 ? 'слово' : 
                        (count >= 2 && count <= 4) ? 'слова' : 'слов';
        const successMessage = `Добавлено ${count} ${wordForm}`;
        toast({
          title: "Успех!",
          description: successMessage,
        });
        
        return { 
          ...prev, 
          words: [...prev.words, ...uniqueNewWords] 
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add words';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  const markAsLearned = (id: string) => {
    setState(prevState => {
      const newWords = prevState.words.map(word => 
        word.id === id ? { ...word, isLearned: true, learned: true } : word
      );
      const newState = { ...prevState, words: newWords };
      saveToLocalStorage(newState);
      return newState;
    });
  };

  const markAsNotLearned = (id: string) => {
    setState(prevState => {
      const newWords = prevState.words.map(word => 
        word.id === id ? { ...word, isLearned: false, learned: false, learningStage: 0 } : word
      );
      const newState = { ...prevState, words: newWords };
      saveToLocalStorage(newState);
      return newState;
    });
  };

  const toggleTranslation = (id: string) => {
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word =>
        word.id === id ? { ...word, showTranslation: !word.showTranslation } : word
      ),
    }));
  };

  const nextWord = () => {
    setState(prevState => {
      const unlearnedWords = prevState.words.filter(word => !word.isLearned);

      if (unlearnedWords.length === 0) {
        toast({
          title: "Поздравляем!",
          description: "Все слова изучены.",
        });
        // Остаемся на текущем слове или можно сбросить currentIndex на 0
        // или на первое слово, если хотим начать сначала.
        // Для простоты пока оставим как есть, или можно вернуть prevState
        // или установить currentIndex на 0, если это предпочтительнее.
        return { ...prevState, currentIndex: 0 }; // Возвращаемся к началу списка
      }

      // Находим текущий индекс в общем списке
      const currentGlobalIndex = prevState.currentIndex;
      let nextGlobalIndex = -1;

      // Ищем следующее неизученное слово после текущего
      for (let i = 1; i <= prevState.words.length; i++) {
        const potentialNextIndex = (currentGlobalIndex + i) % prevState.words.length;
        if (!prevState.words[potentialNextIndex].isLearned) {
          nextGlobalIndex = potentialNextIndex;
          break;
        }
      }
      
      // Если по какой-то причине не нашли (не должно случиться, если есть unlearnedWords)
      // то просто берем первое неизученное слово
      if (nextGlobalIndex === -1) {
         const firstUnlearnedWord = prevState.words.find(w => !w.isLearned);
         if (firstUnlearnedWord) {
            nextGlobalIndex = prevState.words.findIndex(w => w.id === firstUnlearnedWord.id);
         } else {
            // Этого не должно произойти, если unlearnedWords.length > 0
            return prevState; 
         }
      }
      
      // Скрываем перевод для нового текущего слова
      const wordsWithHiddenTranslation = prevState.words.map((word, index) => 
        index === nextGlobalIndex ? { ...word, showTranslation: false } : word
      );

      return { 
        ...prevState, 
        words: wordsWithHiddenTranslation, 
        currentIndex: nextGlobalIndex 
      };
    });
  };

  const resetWords = () => { // This will be returned as resetProgress
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word => ({
        ...word,
        isLearned: false,
        showTranslation: false,
        learningStage: 0,
        lastReviewed: null,
        nextReview: null,
      })),
      currentIndex: prevState.words.length > 0 ? 0 : 0,
    }));
  };

  const deleteWord = (id: string) => {
    setState(prevState => {
      const updatedWords = prevState.words.filter(word => word.id !== id);
      let newCurrentIndex = prevState.currentIndex;
      if (newCurrentIndex >= updatedWords.length) {
        newCurrentIndex = Math.max(0, updatedWords.length - 1);
      }
      // Сохраняем новое состояние в localStorage сразу
      const newState = {
        ...prevState,
        words: updatedWords,
        currentIndex: newCurrentIndex,
      };
      saveToLocalStorage(newState);
      return newState;
    });
  };
  
  const updateWord = (updatedWord: Word) => {
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word => (word.id === updatedWord.id ? updatedWord : word)),
    }));
  };

  const replaceAllWords = (newWords: Word[]) => {
    setState(() => {
      const newCurrentIndex = newWords.length > 0 ? 0 : 0;
      if (newWords.length === 0) {
        toast({
          title: "Успех!",
          description: 'Список слов очищен.',
        });
      }
      return {
        words: newWords,
        currentIndex: newCurrentIndex,
      };
    });
  };

  const clearAllWords = () => {
    setState({ ...initialState});
    saveToLocalStorage({...initialState});
    toast({
      title: "Успех!",
      description: "Все слова удалены из коллекции",
    });
  };

  // Calculated values
  const currentWord = state.words.length > 0 && state.currentIndex < state.words.length
    ? state.words[state.currentIndex]
    : undefined;

  const totalWords = state.words.length;
  const learnedCount = state.words.filter(word => word.isLearned).length;
  const stats = {
    total: totalWords,
    learned: learnedCount,
    remaining: totalWords - learnedCount,
  };

  return {
    words: state.words,
    currentIndex: state.currentIndex,
    currentWord,
    stats,
    addWords,
    markAsLearned,
    markAsNotLearned,
    toggleTranslation,
    nextWord,
    resetProgress: resetWords,
    deleteWord,
    updateWord,
    updateWords,
    replaceAllWords,
    clearAllWords
  };
};