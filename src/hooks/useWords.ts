import { useState, useEffect } from 'react';
import { Word, WordsState } from '../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';

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
    if (state.words.length > 0 || state.currentIndex > 0) { // Also save if currentIndex changed but words didn't, to persist view state
      saveToLocalStorage(state);
    }
  }, [state]);
  
  // Add new words. Accepts an array of Word objects.
  const addWords = (newWords: Word[]) => {
    if (newWords.length === 0) return;
    
    setState(prevState => {
      // Filter out duplicates based on Hebrew word
      const filteredNewWords = newWords.filter(
        newWord => !prevState.words.some(word => word.hebrew === newWord.hebrew)
      );
      
      if (filteredNewWords.length === 0) {
        // Optionally, provide feedback to the user that all words were duplicates
        console.log("All provided words are duplicates and were not added.");
        return prevState; // No change if all are duplicates
      }

      return {
        ...prevState,
        words: [...prevState.words, ...filteredNewWords],
        // Optionally, set currentIndex to the start of the newly added words
        // currentIndex: prevState.words.length 
      };
    });
  };
  
  // Mark a word as learned
  const markAsLearned = (id: string) => {
    setState(prevState => {
      const updatedWords = prevState.words.map(word => 
        word.id === id ? { ...word, isLearned: true } : word // Corrected to isLearned
      );
      return { ...prevState, words: updatedWords };
    });
  };

  // Toggle translation visibility for a word
  const toggleTranslation = (id: string) => {
    setState(prevState => {
      const updatedWords = prevState.words.map(word =>
        word.id === id ? { ...word, showTranslation: !word.showTranslation } : word
      );
      return { ...prevState, words: updatedWords };
    });
  };

  // Move to the next word
  const nextWord = () => {
    setState(prevState => {
      if (prevState.words.length === 0) return prevState;
      // Hide translation of current card before moving to next
      const wordsWithHiddenTranslation = prevState.words.map((word, index) => 
        index === prevState.currentIndex ? { ...word, showTranslation: false } : word
      );
      
      const newIndex = (prevState.currentIndex + 1) % wordsWithHiddenTranslation.length;
      return { ...prevState, words: wordsWithHiddenTranslation, currentIndex: newIndex };
    });
  };

  // Reset all words (clear learned status, etc.) - example, can be expanded
  const resetWords = () => {
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
      currentIndex: prevState.words.length > 0 ? 0 : 0, // Reset to first word or 0 if no words
    }));
  };

  // Delete a word by its ID
  const deleteWord = (id: string) => {
    setState(prevState => {
      const updatedWords = prevState.words.filter(word => word.id !== id);
      let newCurrentIndex = prevState.currentIndex;
      if (prevState.currentIndex >= updatedWords.length && updatedWords.length > 0) {
        newCurrentIndex = updatedWords.length - 1;
      } else if (updatedWords.length === 0) {
        newCurrentIndex = 0;
      }
      return {
        ...prevState,
        words: updatedWords,
        currentIndex: newCurrentIndex,
      };
    });
  };
  
  // Update an existing word
  const updateWord = (updatedWord: Word) => {
    setState(prevState => ({
      ...prevState,
      words: prevState.words.map(word => (word.id === updatedWord.id ? updatedWord : word)),
    }));
  };


  return { 
    ...state, 
    addWords, 
    markAsLearned, 
    toggleTranslation, 
    nextWord, 
    resetWords,
    deleteWord,
    updateWord,
  };
};