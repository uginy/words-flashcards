import { useState, useEffect } from 'react';
import { Word, WordsState } from '../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import { parseAndTranslateWords } from '../utils/translation';

const initialState: WordsState = {
  words: [],
  currentIndex: 0,
};

export const useWords = () => {
  const [state, setState] = useState<WordsState>(initialState);
  
  // Load from localStorage on initial render
  useEffect(() => {
    const savedState = loadFromLocalStorage();
    if (savedState) {
      setState(savedState);
    }
  }, []);
  
  // Save to localStorage whenever state changes
  useEffect(() => {
    if (state.words.length > 0) {
      saveToLocalStorage(state);
    }
  }, [state]);
  
  // Add new words from text input
  const addWords = (text: string) => {
    const newWords = parseAndTranslateWords(text);
    if (newWords.length === 0) return;
    
    setState(prevState => {
      // Filter out duplicates
      const filteredNewWords = newWords.filter(
        newWord => !prevState.words.some(word => word.hebrew === newWord.hebrew)
      );
      
      return {
        ...prevState,
        words: [...prevState.words, ...filteredNewWords],
      };
    });
  };
  
  // Mark a word as learned
  const markAsLearned = (id: string) => {
    setState(prevState => {
      const updatedWords = prevState.words.map(word => 
        word.id === id ? { ...word, learned: true } : word
      );
      
      return {
        ...prevState,
        words: updatedWords,
      };
    });
  };
  
  // Mark a word as not learned (to review again)
  const markAsNotLearned = (id: string) => {
    setState(prevState => {
      const updatedWords = prevState.words.map(word => 
        word.id === id ? { ...word, learned: false } : word
      );
      
      return {
        ...prevState,
        words: updatedWords,
      };
    });
  };
  
  // Get the next word to learn
  const nextWord = () => {
    setState(prevState => {
      // Find words that haven't been learned yet
      const unlearned = prevState.words.filter(word => !word.learned);
      if (unlearned.length === 0) return prevState;
      
      // Calculate next index, wrapping around if needed
      const nextIndex = (prevState.currentIndex + 1) % unlearned.length;
      
      return {
        ...prevState,
        currentIndex: nextIndex,
      };
    });
  };
  
  // Get the current word to display
  const getCurrentWord = (): Word | null => {
    const unlearned = state.words.filter(word => !word.learned);
    if (unlearned.length === 0) return null;
    
    const safeIndex = Math.min(state.currentIndex, unlearned.length - 1);
    return unlearned[safeIndex];
  };
  
  // Reset all progress (mark all words as not learned)
  const resetProgress = () => {
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word => ({ ...word, learned: false })),
      currentIndex: 0,
    }));
  };
  
  // Delete a word
  const deleteWord = (id: string) => {
    setState(prevState => ({
      ...prevState,
      words: prevState.words.filter(word => word.id !== id),
      currentIndex: 0,
    }));
  };
  
  return {
    words: state.words,
    currentWord: getCurrentWord(),
    addWords,
    markAsLearned,
    markAsNotLearned,
    nextWord,
    resetProgress,
    deleteWord,
    stats: {
      total: state.words.length,
      learned: state.words.filter(word => word.learned).length,
      remaining: state.words.filter(word => !word.learned).length,
    },
  };
};