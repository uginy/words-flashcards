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
  
  // Add new words. Accepts an array of Word objects.
  const addWords = async (newWordsFromInput: Word[]) => {
    try {
      // Input is now an array of Word objects, so no parsing is needed.
      // Filter out any words that might be empty or invalid, though this should ideally be handled before calling addWords.
      const validNewWords = newWordsFromInput.filter(word => word.hebrew && word.russian);
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
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word => 
        word.id === id ? { ...word, isLearned: true } : word
      ),
    }));
  };

  const markAsNotLearned = (id: string) => {
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word => 
        word.id === id ? { ...word, isLearned: false, learningStage: 0 } : word 
      ),
    }));
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
      if (prevState.words.length === 0) return prevState;
      const wordsWithHiddenTranslation = prevState.words.map((word, index) => 
        index === prevState.currentIndex ? { ...word, showTranslation: false } : word
      );
      
      const newIndex = (prevState.currentIndex + 1) % wordsWithHiddenTranslation.length;
      return { ...prevState, words: wordsWithHiddenTranslation, currentIndex: newIndex };
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
      return {
        ...prevState,
        words: updatedWords,
        currentIndex: newCurrentIndex,
      };
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
    // Reset to initial state - this will trigger our useEffect which saves to localStorage
    setState(initialState);
    toast({
      title: "Успех!",
      description: "Все слова удалены.",
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
    replaceAllWords,
    clearAllWords,
  };
};